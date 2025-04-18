import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
import boto3
import io
import json
from aws_utils import (
    get_all_regions, 
    list_ec2_instances, 
    list_rds_instances, 
    get_instance_metrics
)
from report_generator import generate_pdf_report

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create SQLAlchemy base
class Base(DeclarativeBase):
    pass

# Initialize SQLAlchemy
db = SQLAlchemy(model_class=Base)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "aws-monitoring-app-secret")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///aws_monitor.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize app with SQLAlchemy
db.init_app(app)

# Create database tables
with app.app_context():
    # Import models
    from models import MonitoringConfig
    db.create_all()

@app.route('/')
def index():
    """Render the home page."""
    return render_template('index.html')

@app.route('/credentials', methods=['GET', 'POST'])
def credentials():
    """Handle AWS credentials collection."""
    if request.method == 'POST':
        # Store credentials in session (not database for security)
        session['aws_access_key'] = request.form.get('aws_access_key')
        session['aws_secret_key'] = request.form.get('aws_secret_key')
        session['account_name'] = request.form.get('account_name')
        
        # Validate credentials before proceeding
        try:
            # Test connection with provided credentials
            boto3.client(
                'ec2',
                region_name='us-east-1',
                aws_access_key_id=session['aws_access_key'],
                aws_secret_access_key=session['aws_secret_key']
            )
            return redirect(url_for('resources'))
        except Exception as e:
            logger.error(f"Failed to validate AWS credentials: {str(e)}")
            error_message = "Invalid AWS credentials. Please check and try again."
            return render_template('credentials.html', error=error_message)
    
    return render_template('credentials.html')

@app.route('/resources', methods=['GET', 'POST'])
def resources():
    """Handle resource selection for monitoring."""
    if 'aws_access_key' not in session or 'aws_secret_key' not in session:
        return redirect(url_for('credentials'))
    
    if request.method == 'POST':
        selected_resources = request.form.getlist('resources')
        session['selected_resources'] = selected_resources
        return redirect(url_for('frequency'))
    
    try:
        # Get all AWS regions
        regions = get_all_regions(
            session['aws_access_key'],
            session['aws_secret_key']
        )
        
        # Collect EC2 and RDS instances from all regions
        ec2_instances = []
        rds_instances = []
        
        for region in regions:
            # Get EC2 instances for this region
            region_ec2 = list_ec2_instances(
                session['aws_access_key'],
                session['aws_secret_key'],
                region
            )
            ec2_instances.extend(region_ec2)
            
            # Get RDS instances for this region
            region_rds = list_rds_instances(
                session['aws_access_key'],
                session['aws_secret_key'],
                region
            )
            rds_instances.extend(region_rds)
        
        return render_template(
            'resources.html',
            ec2_instances=ec2_instances,
            rds_instances=rds_instances
        )
    except Exception as e:
        logger.error(f"Error fetching AWS resources: {str(e)}")
        error_message = f"Failed to retrieve AWS resources: {str(e)}"
        return render_template('resources.html', error=error_message)

@app.route('/frequency', methods=['GET', 'POST'])
def frequency():
    """Handle monitoring frequency selection."""
    if 'selected_resources' not in session:
        return redirect(url_for('resources'))
    
    if request.method == 'POST':
        session['frequency'] = request.form.get('frequency')
        
        # Create and save monitoring configuration
        config = {
            'account_name': session['account_name'],
            'resources': session['selected_resources'],
            'frequency': session['frequency'],
            'created_at': datetime.utcnow().isoformat()
        }
        
        try:
            from models import MonitoringConfig
            new_config = MonitoringConfig(
                account_name=session['account_name'],
                resources=json.dumps(session['selected_resources']),
                frequency=session['frequency']
            )
            db.session.add(new_config)
            db.session.commit()
        except Exception as e:
            logger.error(f"Failed to save monitoring configuration: {str(e)}")
        
        return redirect(url_for('report'))
    
    return render_template('frequency.html')

@app.route('/report', methods=['GET'])
def report():
    """Display report generation page."""
    if 'frequency' not in session:
        return redirect(url_for('frequency'))
    
    # Add current date to the template context
    now = datetime.now()
    
    return render_template('report.html', account_name=session['account_name'], now=now)

@app.route('/generate_report', methods=['POST'])
def generate_report():
    """Generate and return the PDF report."""
    try:
        # Get necessary data from session
        aws_access_key = session.get('aws_access_key')
        aws_secret_key = session.get('aws_secret_key')
        account_name = session.get('account_name')
        selected_resources = session.get('selected_resources', [])
        frequency = session.get('frequency', 'daily')
        
        if not (aws_access_key and aws_secret_key and account_name):
            return jsonify({'error': 'Missing required session data'}), 400
        
        # Period for metrics based on frequency
        period = 7 if frequency == 'weekly' else 1
        
        # Generate the PDF report
        metrics_data = get_instance_metrics(
            aws_access_key, 
            aws_secret_key, 
            selected_resources, 
            period
        )
        
        pdf_data = generate_pdf_report(
            account_name,
            metrics_data
        )
        
        # Create file in memory
        pdf_io = io.BytesIO(pdf_data)
        pdf_io.seek(0)
        
        # Generate filename with account name and current date
        today = datetime.now().strftime('%d-%m-%Y')
        filename = f"{account_name}-{today}.pdf"
        
        # Return the file for download
        return send_file(
            pdf_io,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Failed to generate report: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ec2_instances', methods=['GET'])
def api_ec2_instances():
    """API endpoint to get EC2 instances for a specific region."""
    if 'aws_access_key' not in session or 'aws_secret_key' not in session:
        return jsonify({'error': 'No AWS credentials in session'}), 401
    
    region = request.args.get('region', 'us-east-1')
    
    try:
        instances = list_ec2_instances(
            session['aws_access_key'],
            session['aws_secret_key'],
            region
        )
        return jsonify(instances)
    except Exception as e:
        logger.error(f"API error listing EC2 instances: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rds_instances', methods=['GET'])
def api_rds_instances():
    """API endpoint to get RDS instances for a specific region."""
    if 'aws_access_key' not in session or 'aws_secret_key' not in session:
        return jsonify({'error': 'No AWS credentials in session'}), 401
    
    region = request.args.get('region', 'us-east-1')
    
    try:
        instances = list_rds_instances(
            session['aws_access_key'],
            session['aws_secret_key'],
            region
        )
        return jsonify(instances)
    except Exception as e:
        logger.error(f"API error listing RDS instances: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


from flask import Flask, request, send_file, jsonify
import logging
from report_generator import generate_pdf_report
from aws_utils import get_instance_metrics
import os
import io

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.route('/generate-utilization-report', methods=['POST'])
def generate_report():
    logger.info("Received report generation request")
    try:
        data = request.json
        logger.info(f"Processing request with data: {data}")
        cloud_account_id = data.get('cloudAccountId')
        resource_ids = data.get('resourceIds', [])
        account_name = data.get('accountName', 'AWS Account')
        period = data.get('period', 1)  # Get period from request
        logger.info(f"Generating report for period: {period} days")

        # Get AWS credentials
        aws_access_key = data.get('aws_access_key')
        aws_secret_key = data.get('aws_secret_key')
        
        if not aws_access_key or not aws_secret_key:
            logger.error("AWS credentials are missing")
            return jsonify({'error': 'AWS credentials are required'}), 400
            
        # Get metrics data
        metrics_data = get_instance_metrics(
            aws_access_key,
            aws_secret_key,
            resource_ids,
            period
        )

        # Generate PDF
        pdf_data = generate_pdf_report(account_name, metrics_data)

        # Save PDF file
        filename = f"aws-account-utilization-report-{account_name}-{cloud_account_id}.pdf"
        filepath = os.path.join('public', 'reports', filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        with open(filepath, 'wb') as f:
            f.write(pdf_data)

        return jsonify({
            'success': True,
            'downloadUrl': f'/reports/{filename}'
        })
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    try:
        print("Starting Python Flask server on port 5001...")
        logger.info("Python Flask server starting...")
        app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)
    except Exception as e:
        print(f"Error starting Flask server: {str(e)}")
        logger.error(f"Failed to start server: {str(e)}")

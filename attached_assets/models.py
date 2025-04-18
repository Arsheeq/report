from datetime import datetime
from app import db

class MonitoringConfig(db.Model):
    """Model for storing AWS monitoring configurations."""
    
    id = db.Column(db.Integer, primary_key=True)
    account_name = db.Column(db.String(100), nullable=False)
    resources = db.Column(db.Text, nullable=False)  # JSON list of resource IDs
    frequency = db.Column(db.String(20), nullable=False)  # 'daily' or 'weekly'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<MonitoringConfig {self.id} - {self.account_name}>'

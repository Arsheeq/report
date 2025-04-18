import io
import os
import logging
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from datetime import datetime
import base64
import pytz

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def create_chart(timestamps, values, metric_name, instance_name, avg, min_val, max_val):
    """Create a chart for the metric and return as bytes."""
    try:
        plt.figure(figsize=(8, 3.5))
        
        # Adjust timestamps for timezone
        if timestamps:
            # Format plot
            plt.plot(timestamps, values, color='#d63384', label=metric_name)
            
            # Plot average line
            plt.axhline(y=avg, color='#d63384', linestyle='-', alpha=0.5, label='Average')
            
            # Format x-axis to show dates
            plt.gca().xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
            plt.gca().xaxis.set_major_locator(mdates.HourLocator(interval=3))
            
            # Add grid
            plt.grid(True, linestyle='--', alpha=0.7)
            
            # Set labels and title
            plt.xlabel('Time')
            plt.ylabel(metric_name)
            
            # Add text for metrics
            plt.figtext(0.01, 0.02, f"Min: {min_val:.2f}%", fontsize=8)
            plt.figtext(0.3, 0.02, f"Max: {max_val:.2f}%", fontsize=8)
            plt.figtext(0.6, 0.02, f"Avg: {avg:.2f}%", fontsize=8)
            
            plt.tight_layout()
            
            # Save plot to bytes
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=150)
            plt.close()
            buf.seek(0)
            
            return buf.getvalue()
        else:
            # Create empty chart with message
            plt.text(0.5, 0.5, 'No data available', horizontalalignment='center', verticalalignment='center')
            plt.tight_layout()
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=150)
            plt.close()
            buf.seek(0)
            
            return buf.getvalue()
    except Exception as e:
        logger.error(f"Error creating chart: {str(e)}")
        # Create error chart
        plt.figure(figsize=(8, 3.5))
        plt.text(0.5, 0.5, f'Error creating chart: {str(e)}', horizontalalignment='center', verticalalignment='center')
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150)
        plt.close()
        buf.seek(0)
        
        return buf.getvalue()

def cover_page(canvas, doc, account_name):
    """Draw the cover page with account name"""
    canvas.saveState()
    
    # Set page size
    width, height = A4
    
    # Draw title
    canvas.setFont("Helvetica-Bold", 24)
    title_lines = [
        f"{account_name}",
        "Account Daily Report"
    ]
    line_height = 50  # vertical spacing between lines
    start_y = height / 2 + line_height / 2

    for i, line in enumerate(title_lines):
        y_position = start_y - i * line_height
        canvas.drawCentredString(width / 2, y_position, line)
    
    # Add date at bottom
    canvas.setFont("Helvetica", 12)
    today = datetime.now().strftime('%d-%m-%Y')
    canvas.drawCentredString(width / 2, 50, f"Generated on: {today}")
    
    canvas.restoreState()

def generate_pdf_report(account_name, metrics_data):
    """Generate a PDF report with metrics data."""
    logger.debug("Generating PDF report...")
    
    # Create a buffer for the PDF
    buffer = io.BytesIO()
    
    # Create the PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='Header',
        fontName='Helvetica-Bold',
        fontSize=14,
        spaceAfter=12
    ))
    styles.add(ParagraphStyle(
        name='SubHeader',
        fontName='Helvetica-Bold',
        fontSize=12,
        spaceAfter=6
    ))
    # Do not redefine 'Normal' style as it already exists in the stylesheet
    # Modify it instead if needed
    styles['Normal'].fontSize = 10
    styles['Normal'].spaceAfter = 6
    
    # Build document content
    content = []
    
    # Add website header
    content.append(Paragraph("www.nubinix.com", styles['Normal']))
    
    # Add nubinix text directly
    content.append(Paragraph("nubinix", styles['Header']))
    content.append(Spacer(1, 0.2*inch))
    
    # Add current date and time
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Loop through each resource
    for resource in metrics_data:
        service_type = resource['service_type']
        
        if service_type == 'EC2':
            # Add EC2 instance information
            content.append(Paragraph(f"Host: {resource['name']} - {resource['id']}", styles['Header']))
            
            # Create instance details table
            instance_data = [
                ['Instance ID', resource['id']],
                ['Type', resource['type']],
                ['Operating System', resource['platform']],
                ['State', resource['state']]
            ]
            
            instance_table = Table(instance_data, colWidths=[2*inch, 4*inch])
            instance_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 5)
            ]))
            content.append(instance_table)
            content.append(Spacer(1, 0.2*inch))
            
            # Add CPU utilization section
            content.append(Paragraph("CPU UTILIZATION", styles['SubHeader']))
            
            # Add remarks about utilization
            cpu_avg = resource['metrics']['cpu']['average']
            if cpu_avg < 10:
                remark = "Average utilisation is low. No action needed at the time."
            elif cpu_avg < 70:
                remark = "Average utilisation is normal"
            else:
                remark = "Average utilisation is high. Consider scaling up resources."
            
            content.append(Paragraph(f"Remarks: {remark}", styles['Normal']))
            
            # Add average CPU utilization
            avg_data = [
                ['Average', f"{cpu_avg:.2f}%"]
            ]
            
            avg_table = Table(avg_data, colWidths=[2*inch, 2*inch])
            avg_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 5)
            ]))
            content.append(avg_table)
            content.append(Spacer(1, 0.1*inch))
            
            # Create CPU chart
            if resource['metrics']['cpu']['timestamps']:
                cpu_chart = create_chart(
                    resource['metrics']['cpu']['timestamps'],
                    resource['metrics']['cpu']['values'],
                    'CPU',
                    resource['name'],
                    resource['metrics']['cpu']['average'],
                    resource['metrics']['cpu']['min'],
                    resource['metrics']['cpu']['max']
                )
                
                img = Image(io.BytesIO(cpu_chart))
                img.drawHeight = 3*inch
                img.drawWidth = 6*inch
                content.append(img)
                content.append(Spacer(1, 0.2*inch))
            
            # Add Memory utilization section
            content.append(Paragraph("MEMORY UTILIZATION", styles['SubHeader']))
            
            # Add remarks about utilization
            memory_avg = resource['metrics']['memory']['average']
            if memory_avg < 50:
                remark = "Average utilisation is low. No action needed at the time."
            elif memory_avg < 80:
                remark = "Average utilisation is normal"
            else:
                remark = "Average utilisation is high. Consider scaling up resources."
            
            content.append(Paragraph(f"Remarks: {remark}", styles['Normal']))
            
            # Add average Memory utilization
            avg_data = [
                ['Average', f"{memory_avg:.2f}%"]
            ]
            
            avg_table = Table(avg_data, colWidths=[2*inch, 2*inch])
            avg_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 5)
            ]))
            content.append(avg_table)
            content.append(Spacer(1, 0.1*inch))
            
            # Create Memory chart
            if resource['metrics']['memory']['timestamps']:
                memory_chart = create_chart(
                    resource['metrics']['memory']['timestamps'],
                    resource['metrics']['memory']['values'],
                    'Memory',
                    resource['name'],
                    resource['metrics']['memory']['average'],
                    resource['metrics']['memory']['min'],
                    resource['metrics']['memory']['max']
                )
                
                img = Image(io.BytesIO(memory_chart))
                img.drawHeight = 3*inch
                img.drawWidth = 6*inch
                content.append(img)
                content.append(Spacer(1, 0.2*inch))
            
            # Add Disk utilization section
            content.append(Paragraph("DISK UTILIZATION", styles['SubHeader']))
            
            # Add remarks about utilization
            disk_avg = resource['metrics']['disk']['average']
            if disk_avg < 50:
                remark = "Average Disk utilisation is Normal."
            elif disk_avg < 80:
                remark = "Average Disk utilisation is Normal."
            else:
                remark = "Average Disk utilisation is high. Consider adding more storage."
            
            content.append(Paragraph(f"Remarks: {remark}", styles['Normal']))
            
            # Add average Disk utilization
            avg_data = [
                ['Average', f"{disk_avg:.2f}%"]
            ]
            
            avg_table = Table(avg_data, colWidths=[2*inch, 2*inch])
            avg_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 5)
            ]))
            content.append(avg_table)
            content.append(Spacer(1, 0.1*inch))
            
            # Create Disk chart
            if resource['metrics']['disk']['timestamps']:
                disk_chart = create_chart(
                    resource['metrics']['disk']['timestamps'],
                    resource['metrics']['disk']['values'],
                    'Disk',
                    resource['name'],
                    resource['metrics']['disk']['average'],
                    resource['metrics']['disk']['min'],
                    resource['metrics']['disk']['max']
                )
                
                img = Image(io.BytesIO(disk_chart))
                img.drawHeight = 3*inch
                img.drawWidth = 6*inch
                content.append(img)
            
            # Add page break
            content.append(Spacer(1, 0.5*inch))
        
        elif service_type == 'RDS':
            # Add RDS instance information
            content.append(Paragraph(f"RDS Instance : {resource['name']}", styles['Header']))
            
            # Create instance details table
            instance_data = [
                ['Instance ID', resource['id']],
                ['Type', resource['type']],
                ['Status', resource['state']],
                ['Engine', resource['engine']]
            ]
            
            instance_table = Table(instance_data, colWidths=[2*inch, 4*inch])
            instance_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 5)
            ]))
            content.append(instance_table)
            content.append(Spacer(1, 0.2*inch))
            
            # Add CPU utilization section
            content.append(Paragraph("CPU UTILIZATION", styles['SubHeader']))
            
            # Add remarks about utilization
            cpu_avg = resource['metrics']['cpu']['average']
            if cpu_avg < 10:
                remark = "Average utilization is normal"
            elif cpu_avg < 70:
                remark = "Average utilization is normal"
            else:
                remark = "Average utilization is high. Consider scaling up resources."
            
            content.append(Paragraph(f"Remarks: {remark}", styles['Normal']))
            
            # Add average CPU utilization
            avg_data = [
                ['Average', f"{cpu_avg:.2f}%"]
            ]
            
            avg_table = Table(avg_data, colWidths=[2*inch, 2*inch])
            avg_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 5)
            ]))
            content.append(avg_table)
            content.append(Spacer(1, 0.1*inch))
            
            # Create CPU chart
            if resource['metrics']['cpu']['timestamps']:
                cpu_chart = create_chart(
                    resource['metrics']['cpu']['timestamps'],
                    resource['metrics']['cpu']['values'],
                    'CPU',
                    resource['name'],
                    resource['metrics']['cpu']['average'],
                    resource['metrics']['cpu']['min'],
                    resource['metrics']['cpu']['max']
                )
                
                img = Image(io.BytesIO(cpu_chart))
                img.drawHeight = 3*inch
                img.drawWidth = 6*inch
                content.append(img)
                content.append(Spacer(1, 0.2*inch))
            
            # Add Memory section
            content.append(Paragraph("AVAILABLE MEMORY (in GB)", styles['SubHeader']))
            
            # Add remarks about memory
            memory_avg = resource['metrics']['memory']['average']
            if memory_avg < 2:
                remark = "Available memory is low. Recommend increasing resources"
            else:
                remark = "Available memory capacity is sufficient"
            
            content.append(Paragraph(f"Remarks: {remark}", styles['Normal']))
            
            # Add average available memory
            avg_data = [
                ['Average', f"{memory_avg:.2f}"]
            ]
            
            avg_table = Table(avg_data, colWidths=[2*inch, 2*inch])
            avg_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 5)
            ]))
            content.append(avg_table)
            content.append(Spacer(1, 0.1*inch))
            
            # Create Memory chart
            if resource['metrics']['memory']['timestamps']:
                memory_chart = create_chart(
                    resource['metrics']['memory']['timestamps'],
                    resource['metrics']['memory']['values'],
                    'Memory',
                    resource['name'],
                    resource['metrics']['memory']['average'],
                    resource['metrics']['memory']['min'],
                    resource['metrics']['memory']['max']
                )
                
                img = Image(io.BytesIO(memory_chart))
                img.drawHeight = 3*inch
                img.drawWidth = 6*inch
                content.append(img)
                content.append(Spacer(1, 0.2*inch))
            
            # Add Disk section
            content.append(Paragraph("AVAILABLE DISK (in GB)", styles['SubHeader']))
            
            # Add remarks about disk
            disk_avg = resource['metrics']['disk']['average']
            if disk_avg < 10:
                remark = "Available disk space is low. Consider adding more storage."
            else:
                remark = "Available disk capacity is sufficient"
            
            content.append(Paragraph(f"Remarks: {remark}", styles['Normal']))
            
            # Add average available disk
            avg_data = [
                ['Average', f"{disk_avg:.2f}"]
            ]
            
            avg_table = Table(avg_data, colWidths=[2*inch, 2*inch])
            avg_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 5)
            ]))
            content.append(avg_table)
            content.append(Spacer(1, 0.1*inch))
            
            # Create Disk chart
            if resource['metrics']['disk']['timestamps']:
                disk_chart = create_chart(
                    resource['metrics']['disk']['timestamps'],
                    resource['metrics']['disk']['values'],
                    'Disk',
                    resource['name'],
                    resource['metrics']['disk']['average'],
                    resource['metrics']['disk']['min'],
                    resource['metrics']['disk']['max']
                )
                
                img = Image(io.BytesIO(disk_chart))
                img.drawHeight = 3*inch
                img.drawWidth = 6*inch
                content.append(img)
            
            # Add page break
            content.append(Spacer(1, 0.5*inch))
    
    # First page will be the cover page
    content.insert(0, PageBreak())
    
    # Build the document with all content and the cover page
    doc.build(
        content, 
        onFirstPage=lambda canvas, doc: cover_page(canvas, doc, account_name)
    )
    
    # Get the PDF data
    pdf_data = buffer.getvalue()
    buffer.close()
    
    return pdf_data

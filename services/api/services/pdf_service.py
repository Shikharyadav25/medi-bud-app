import io
from typing import Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_meal_plan_pdf(plan_data: Dict[str, Any], user_name: str = "User") -> bytes:
    """
    Renders an official, beautifully structured 7-Day Indian Meal Plan PDF
    using ReportLab with explicit estimate disclaimers.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a')
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569')
    )
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0d9488')
    )
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )
    cell_bold_style = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0f172a')
    )
    disclaimer_style = ParagraphStyle(
        'DisclaimerText',
        parent=styles['Italic'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748b')
    )

    story = []

    # Header
    story.append(Paragraph("Medi Bud AI Health Companion", title_style))
    story.append(Paragraph("Personalized 7-Day Indian Meal Plan & Estimated Nutrition", subtitle_style))
    story.append(Spacer(1, 10))

    # Preferences info
    prefs = plan_data.get("preferences_snapshot", {})
    pref_text = (
        f"<b>Prepared for:</b> {user_name} &nbsp;|&nbsp; "
        f"<b>Dietary Mode:</b> {'Vegetarian' if prefs.get('is_veg', True) else 'Non-Vegetarian'} &nbsp;|&nbsp; "
        f"<b>Allergens Excluded:</b> {', '.join(prefs.get('declared_allergens', [])) or 'None declared'}"
    )
    story.append(Paragraph(pref_text, cell_style))
    story.append(Spacer(1, 12))

    # Table of 7 Days
    table_data = [
        [
            Paragraph("Day", cell_bold_style),
            Paragraph("Breakfast", cell_bold_style),
            Paragraph("Lunch", cell_bold_style),
            Paragraph("Snack", cell_bold_style),
            Paragraph("Dinner", cell_bold_style),
            Paragraph("Est. Daily Macros", cell_bold_style)
        ]
    ]

    for day in plan_data.get("days", []):
        d_num = f"Day {day.get('day', 1)}"
        meals = day.get("meals", {})
        b_name = meals.get("breakfast", {}).get("name", "—")
        l_name = meals.get("lunch", {}).get("name", "—")
        s_name = meals.get("snack", {}).get("name", "—")
        d_name = meals.get("dinner", {}).get("name", "—")

        nut = day.get("daily_nutrition_summary", {})
        macro_text = (
            f"<b>{nut.get('calories', 0)} kcal</b><br/>"
            f"P: {nut.get('protein_g', 0)}g | C: {nut.get('carbs_g', 0)}g<br/>"
            f"F: {nut.get('fat_g', 0)}g | Fib: {nut.get('fiber_g', 0)}g"
        )

        table_data.append([
            Paragraph(d_num, cell_bold_style),
            Paragraph(b_name, cell_style),
            Paragraph(l_name, cell_style),
            Paragraph(s_name, cell_style),
            Paragraph(d_name, cell_style),
            Paragraph(macro_text, cell_style)
        ])

    table = Table(table_data, colWidths=[45, 100, 110, 95, 110, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f0fdfa')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0d9488')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
    ]))
    story.append(table)
    story.append(Spacer(1, 16))

    # Disclaimer block
    disclaimer = (
        "<b>Important Notice:</b> Medi Bud is an academic health companion prototype. "
        "All nutritional values and portion sizes are approximate calculations based on the "
        "ICMR-NIN Indian Food Composition Tables (IFCT 2017) for general wellness education. "
        "This plan is not a clinical diet, disease-specific therapy, or medical prescription. "
        "Consult a certified clinical nutritionist or physician before undertaking significant dietary changes."
    )
    story.append(Paragraph(disclaimer, disclaimer_style))

    doc.build(story)
    return buffer.getvalue()

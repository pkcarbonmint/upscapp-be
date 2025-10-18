# Word Template Guide

This guide explains how to create a Word document template (.docx) with predefined styles that the `WordTemplateCalendarDocxService` can use.

## Overview

The Word Template Service generates documents by:
1. **Loading an actual Word document** (.docx) as a template
2. **Using the predefined Word styles** from that template
3. **Generating content** that references those styles by name

## Creating the Word Template

### Step 1: Create a New Word Document

1. Open Microsoft Word
2. Create a new blank document
3. Save it as `calendar-template.docx` in the `templates/` folder

### Step 2: Define Required Styles

Go to **Home > Styles > Styles Pane** (or press Ctrl+Alt+Shift+S) and create the following custom styles:

#### Cover Page Styles

1. **DocumentTitle**
   - Font: Aptos, 42pt, Bold
   - Color: #2E5BBA (Blue)
   - Alignment: Center
   - Spacing After: 0pt

2. **StudentName**
   - Font: Aptos, 36pt, Bold
   - Color: #333333 (Dark Gray)
   - Alignment: Center
   - Spacing After: 100pt

3. **DocumentSubtitle**
   - Font: Aptos, 18pt
   - Color: #666666 (Medium Gray)
   - Alignment: Center
   - Spacing After: 200pt

4. **SectionHeading**
   - Font: Aptos, 24pt, Bold
   - Color: #2E5BBA (Blue)
   - Alignment: Center
   - Spacing After: 400pt

5. **Quote**
   - Font: Aptos, 18pt, Italic
   - Color: #2E5BBA (Blue)
   - Alignment: Center

6. **QuoteAuthor**
   - Font: Aptos, 14pt
   - Color: #666666 (Medium Gray)
   - Alignment: Center
   - Spacing Before: 200pt

7. **CoverFooter**
   - Font: Aptos, 14pt
   - Color: #666666 (Medium Gray)
   - Alignment: Center
   - Spacing After: 200pt

8. **GenerationDate**
   - Font: Aptos, 12pt
   - Color: #666666 (Medium Gray)
   - Alignment: Center

#### Main Content Styles

9. **MainHeading**
   - Font: Aptos, 28pt, Bold
   - Color: #2E5BBA (Blue)
   - Spacing After: 400pt

10. **SubHeading**
    - Font: Aptos, 24pt, Bold
    - Color: #2E5BBA (Blue)
    - Spacing After: 400pt

11. **MonthTitle**
    - Font: Aptos, 28pt, Bold
    - Color: #2E5BBA (Blue)

12. **CycleName**
    - Font: Aptos, 25pt, Bold
    - Color: #2E5BBA (Blue)

#### Calendar Styles

13. **CalendarCycleName**
    - Font: Aptos, 10pt, Bold
    - Color: #2E5BBA (Blue)

14. **CalendarMonthName**
    - Font: Aptos, 12pt, Bold
    - Color: #333333 (Dark Gray)

15. **CalendarDayHeader**
    - Font: Aptos, 8pt, Bold
    - Color: #666666 (Medium Gray)

16. **CalendarDay**
    - Font: Aptos, 8pt
    - Color: #333333 (Dark Gray)

17. **MonthlyCalendarHeader**
    - Font: Aptos, 12pt, Bold
    - Color: #2E5BBA (Blue)

18. **CalendarDayNumber**
    - Font: Aptos, 14pt, Bold
    - Color: #333333 (Dark Gray)

19. **CalendarSubject**
    - Font: Aptos, 8pt
    - Color: #333333 (Dark Gray)

#### Info and Strategy Styles

20. **InfoIcon**
    - Font: Aptos, 16pt
    - Color: #2E5BBA (Blue)

21. **InfoLabel**
    - Font: Aptos, 14pt, Bold
    - Color: #666666 (Medium Gray)

22. **InfoValue**
    - Font: Aptos, 14pt
    - Color: #333333 (Dark Gray)

23. **StrategyIcon**
    - Font: Aptos, 20pt
    - Color: #2E5BBA (Blue)

24. **StrategyTitle**
    - Font: Aptos, 12pt, Bold
    - Color: #666666 (Medium Gray)

25. **StrategyValue**
    - Font: Aptos, 14pt
    - Color: #333333 (Dark Gray)

#### Resource Styles

26. **SubjectCardTitle**
    - Font: Aptos, 14pt, Bold
    - Color: #2E5BBA (Blue)

27. **ResourceCategoryTitle**
    - Font: Aptos, 10pt, Bold
    - Color: #666666 (Medium Gray)

28. **ResourceItem**
    - Font: Aptos, 9pt
    - Color: #333333 (Dark Gray)

29. **NoResourcesMessage**
    - Font: Aptos, 14pt, Italic
    - Color: #666666 (Medium Gray)

#### Table Styles

30. **TableHeader**
    - Font: Aptos, 20pt, Bold
    - Color: #2E5BBA (Blue)

31. **TableCell**
    - Font: Aptos, 20pt
    - Color: #333333 (Dark Gray)

### Step 3: Save the Template

1. Save the document as `calendar-template.docx`
2. Place it in the `study-planner/helios-ts/templates/` directory

## How to Create a Style in Word

1. **Open Styles Pane**: Home > Styles > Styles Pane (or Ctrl+Alt+Shift+S)
2. **Create New Style**: Click "New Style" button at bottom of pane
3. **Set Style Properties**:
   - **Name**: Enter the exact style name (e.g., "DocumentTitle")
   - **Style Type**: Paragraph
   - **Based On**: Normal
   - **Font**: Set font family, size, bold, italic as needed
   - **Color**: Set text color using the color picker
   - **Alignment**: Set paragraph alignment
   - **Spacing**: Set before/after paragraph spacing
4. **Save Style**: Click OK

## Color Codes

Use these exact color codes when creating styles:

- **Primary Blue**: #2E5BBA
- **Dark Gray**: #333333
- **Medium Gray**: #666666
- **Light Gray**: #E0E0E0

## Testing the Template

1. Create the template with all required styles
2. Save it as `calendar-template.docx` in the templates folder
3. Run the service:
   ```bash
   cd study-planner/helios-ts
   npx tsx scripts/generate-test-documents.ts -s T1
   ```
4. Check the console output for template loading confirmation
5. Open the generated document to verify styling

## Benefits of Word Templates

1. **True WYSIWYG**: Design styles directly in Word
2. **No Code Changes**: Modify appearance by editing the template
3. **Professional Tools**: Use Word's full formatting capabilities
4. **Easy Maintenance**: Non-programmers can update styles
5. **Consistent Branding**: Ensure consistent look across all documents

## Troubleshooting

- **Template not found**: Ensure the file is named exactly `calendar-template.docx`
- **Styles not applied**: Check that style names match exactly (case-sensitive)
- **Wrong colors**: Verify hex color codes are correct
- **Missing fonts**: Ensure Aptos font is available on the system

## Advanced Customization

You can customize:
- **Fonts**: Change to your organization's brand fonts
- **Colors**: Update the color scheme to match your branding
- **Spacing**: Adjust paragraph and line spacing
- **Borders**: Add borders and shading to styles
- **Numbering**: Add automatic numbering to heading styles

The service will automatically use whatever styles are defined in your template file!
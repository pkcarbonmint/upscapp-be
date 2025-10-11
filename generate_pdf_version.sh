#!/bin/bash

# Create a PDF-friendly version by replacing emojis with text equivalents
sed 's/🎯/[TARGET]/g; s/📅/[CALENDAR]/g; s/📰/[NEWS]/g; s/🔄/[CYCLE]/g; s/📦/[PACKAGE]/g; s/📚/[BOOKS]/g; s/📋/[CLIPBOARD]/g; s/🎨/[ART]/g; s/🧠/[BRAIN]/g; s/📊/[CHART]/g; s/✅/[CHECK]/g' HOW_THE_ENGINE_WORKS.md > HOW_THE_ENGINE_WORKS_pdf.md

# Generate PDF
pandoc -o HOW_THE_ENGINE_WORKS.pdf HOW_THE_ENGINE_WORKS_pdf.md

# Clean up temporary file
rm HOW_THE_ENGINE_WORKS_pdf.md

echo "PDF generated successfully without emoji issues!"


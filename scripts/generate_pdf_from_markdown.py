#!/usr/bin/env python3
"""
PDF Generator from Helios Markdown Output

This script converts generated markdown study plans to beautifully formatted PDFs
using pandoc with custom styling and fonts.

Usage:
    python scripts/generate_pdf_from_markdown.py --file generated_outputs/05c-scenario-priya-test-spec-helios-output.md
    python scripts/generate_pdf_from_markdown.py --all
    python scripts/generate_pdf_from_markdown.py --list
"""

import argparse
import os
import sys
import subprocess
from pathlib import Path
from typing import List, Optional
import tempfile

class PDFGenerator:
    """Generate PDFs from Helios markdown output files."""
    
    def __init__(self, input_dir: str = "generated_outputs", output_dir: str = "pdf_outputs"):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
    def list_markdown_files(self) -> List[str]:
        """List all available markdown files for conversion."""
        markdown_files = []
        for file_path in self.input_dir.glob("*-helios-output.md"):
            markdown_files.append(file_path.name)
        return sorted(markdown_files)
    
    def check_pandoc_availability(self) -> bool:
        """Check if pandoc is available on the system."""
        try:
            result = subprocess.run(['pandoc', '--version'], 
                                  capture_output=True, text=True, check=True)
            print(f"✅ Pandoc found: {result.stdout.split()[1]}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Error: pandoc not found. Please install pandoc:")
            print("  Ubuntu/Debian: sudo apt-get install pandoc")
            print("  macOS: brew install pandoc")
            print("  Windows: Download from https://pandoc.org/installing.html")
            return False
    
    def create_latex_template(self) -> str:
        """Create a custom LaTeX template for better formatting."""
        template_content = r"""
\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage{microtype}
\usepackage{geometry}
\usepackage{fancyhdr}
\usepackage{titlesec}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{booktabs}
\usepackage{longtable}
\usepackage{array}
\usepackage{multirow}
\usepackage{wrapfig}
\usepackage{float}
\usepackage{colortbl}
\usepackage{pdflscape}
\usepackage{tabu}
\usepackage{threeparttable}
\usepackage{threeparttablex}
\usepackage[normalem]{ulem}
\usepackage{makecell}

% Fix for pandoc's tightlist
\providecommand{\tightlist}{%
  \setlength{\itemsep}{0pt}\setlength{\parskip}{0pt}}

% Page geometry
\geometry{
    top=2.5cm,
    bottom=2.5cm,
    left=2.5cm,
    right=2.5cm,
    headheight=14pt
}

% Colors
\definecolor{primaryblue}{RGB}{41, 128, 185}
\definecolor{darkgray}{RGB}{52, 73, 94}
\definecolor{lightgray}{RGB}{236, 240, 241}

% Headers and footers
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\textcolor{primaryblue}{\textbf{Helios Study Plan}}}
\fancyhead[R]{\textcolor{darkgray}{\today}}
\fancyfoot[C]{\textcolor{darkgray}{\thepage}}
\renewcommand{\headrulewidth}{0.5pt}
\renewcommand{\footrulewidth}{0pt}

% Section formatting
\titleformat{\section}
{\color{primaryblue}\Large\bfseries}
{\thesection}{1em}{}

\titleformat{\subsection}
{\color{darkgray}\large\bfseries}
{\thesubsection}{1em}{}

\titleformat{\subsubsection}
{\color{darkgray}\normalsize\bfseries}
{\thesubsubsection}{1em}{}

% Hyperlink colors
\hypersetup{
    colorlinks=true,
    linkcolor=primaryblue,
    urlcolor=primaryblue,
    citecolor=primaryblue
}

% List formatting
\usepackage{enumitem}
\setlist[itemize]{leftmargin=*}
\setlist[enumerate]{leftmargin=*}

% Code formatting
\usepackage{listings}
\lstset{
    basicstyle=\ttfamily\small,
    backgroundcolor=\color{lightgray},
    frame=single,
    breaklines=true,
    columns=flexible
}

$if(title)$
\title{\textcolor{primaryblue}{\textbf{$title$}}}
$endif$

$if(author)$
\author{$author$}
$endif$

$if(date)$
\date{$date$}
$endif$

\begin{document}

$if(title)$
\maketitle
\thispagestyle{empty}
\newpage
$endif$

$if(toc)$
\tableofcontents
\newpage
$endif$

$body$

\end{document}
"""
        return template_content
    
    def generate_pdf(self, markdown_file: str, custom_name: Optional[str] = None) -> bool:
        """Generate PDF from a markdown file."""
        input_path = self.input_dir / markdown_file
        
        if not input_path.exists():
            print(f"❌ Error: File {markdown_file} not found in {self.input_dir}")
            return False
        
        # Determine output filename
        if custom_name:
            output_filename = f"{custom_name}.pdf"
        else:
            # Extract scenario name from filename
            base_name = markdown_file.replace('-helios-output.md', '')
            if 'priya' in base_name.lower():
                output_filename = "priya-study-plan.pdf"
            elif 'ananth' in base_name.lower():
                output_filename = "ananth-study-plan.pdf"
            else:
                output_filename = f"{base_name}.pdf"
        
        output_path = self.output_dir / output_filename
        
        # Create temporary LaTeX template
        with tempfile.NamedTemporaryFile(mode='w', suffix='.tex', delete=False) as temp_template:
            temp_template.write(self.create_latex_template())
            template_path = temp_template.name
        
        try:
            # Build pandoc command with enhanced options
            pandoc_cmd = [
                'pandoc',
                str(input_path),
                '--template', template_path,
                '--pdf-engine=xelatex',
                '--toc',
                '--toc-depth=3',
                '--number-sections',
                '--highlight-style=tango',
                '--variable', 'geometry:margin=2.5cm',
                '--variable', 'fontsize=11pt',
                '--variable', 'linestretch=1.2',
                '--variable', 'links-as-notes=true',
                '-o', str(output_path)
            ]
            
            print(f"🔄 Converting {markdown_file} to PDF...")
            result = subprocess.run(pandoc_cmd, capture_output=True, text=True, check=True)
            
            print(f"✅ Generated: {output_path}")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error converting {markdown_file}: {e}")
            if e.stderr:
                print(f"   Stderr: {e.stderr}")
            return False
        finally:
            # Clean up temporary template
            try:
                os.unlink(template_path)
            except OSError:
                pass
    
    def generate_all_pdfs(self) -> None:
        """Generate PDFs for all available markdown files."""
        markdown_files = self.list_markdown_files()
        
        if not markdown_files:
            print("No markdown files found for conversion!")
            return
        
        print(f"Found {len(markdown_files)} markdown files to convert:")
        for file in markdown_files:
            print(f"  - {file}")
        
        print(f"\nGenerating PDFs to: {self.output_dir}")
        
        success_count = 0
        for markdown_file in markdown_files:
            print(f"\nProcessing: {markdown_file}")
            if self.generate_pdf(markdown_file):
                success_count += 1
        
        print(f"\n✅ Completed! {success_count}/{len(markdown_files)} PDFs generated successfully.")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Convert Helios markdown study plans to beautifully formatted PDFs"
    )
    parser.add_argument(
        "--file", 
        help="Specific markdown file to convert (e.g., 05c-scenario-priya-test-spec-helios-output.md)"
    )
    parser.add_argument(
        "--all", 
        action="store_true", 
        help="Convert all available markdown files"
    )
    parser.add_argument(
        "--list", 
        action="store_true", 
        help="List all available markdown files"
    )
    parser.add_argument(
        "--input-dir", 
        default="generated_outputs",
        help="Input directory containing markdown files (default: generated_outputs)"
    )
    parser.add_argument(
        "--output-dir", 
        default="pdf_outputs",
        help="Output directory for PDF files (default: pdf_outputs)"
    )
    parser.add_argument(
        "--name",
        help="Custom name for the output PDF file (without extension)"
    )
    
    args = parser.parse_args()
    
    generator = PDFGenerator(args.input_dir, args.output_dir)
    
    # Check if pandoc is available
    if not generator.check_pandoc_availability():
        sys.exit(1)
    
    if args.list:
        markdown_files = generator.list_markdown_files()
        if markdown_files:
            print("Available markdown files:")
            for file in markdown_files:
                print(f"  - {file}")
        else:
            print("No markdown files found!")
        return
    
    if args.file:
        success = generator.generate_pdf(args.file, args.name)
        if not success:
            sys.exit(1)
    elif args.all:
        generator.generate_all_pdfs()
    else:
        parser.print_help()
        print("\nUse --list to see available files or --file to convert a specific one.")


if __name__ == "__main__":
    main()

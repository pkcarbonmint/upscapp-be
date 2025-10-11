#!/bin/bash -v
pandoc -o mentorship-specification.docx \
       -V mainfont="Noto Sans" -V sansfont="Noto Sans" -V monofont="Noto Mono" \
       --toc \
       --number-sections \
       [0-9]*md

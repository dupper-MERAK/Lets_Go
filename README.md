Jekyll Case Study Site

Quick start (local):

1. Install Ruby, then run:
   gem install bundler jekyll
2. From the repo root run:
   bundle exec jekyll serve --livereload
3. Open http://127.0.0.1:4000

This site is configured for GitHub Pages. Push the branch to your repository and enable Pages on the repo settings (branch: this branch, folder: / (root)).

To add a case study: create a markdown file in `_case_studies/` with front matter `title`, `date`, `summary`, and `layout: case_study`.

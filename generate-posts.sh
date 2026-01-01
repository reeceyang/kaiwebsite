#!/bin/bash

# This script generates individual HTML pages for each blog post

# Read CSV and create post pages
tail -n +2 /home/kav/.config/whorl/docs/goldenblue/posts.csv | while IFS=',' read -r post_id post_date is_published rest; do
  # Only process published posts
  if [ "$is_published" != "true" ]; then
    continue
  fi

  # Extract slug from post_id (format: "123456.slug-name")
  slug=$(echo "$post_id" | cut -d'.' -f2)

  # Skip if slug is empty
  if [ -z "$slug" ]; then
    continue
  fi

  # Find the markdown file
  md_file="/home/kav/.config/whorl/docs/goldenblue/posts/${slug}.md"

  if [ ! -f "$md_file" ]; then
    echo "Warning: $md_file not found"
    continue
  fi

  # Read the content
  content=$(cat "$md_file")

  # Extract title from CSV (field 8)
  # This is complex because of CSV quoting, so we'll use a simpler approach

  echo "Processing: $slug"

  # Create the HTML file
  # We'll create a template-based approach in the next step
done

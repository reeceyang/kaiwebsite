// Art, by hand. scripts/scrape-substack.js never touches this file — nothing on
// Substack is art, so the two halves of the gallery stay independent.
//
// ---- adding a piece ----------------------------------------------------
// Drop the image in art/ and append one record. Newest first isn't required;
// the gallery sorts by date. Fields:
//   slug      unique id, also the deterministic seed for its position
//   title     shown under the render
//   medium    e.g. 'oil on canvas' — shown next to the year
//   date      'YYYY-MM-DD' if known, or just 'YYYY'
//   image     path from the site root
//   aspect    width / height, so the gallery can reserve space before the
//             image loads and never re-layout on top of a placed neighbour
window.GALLERY_ART = [
  {
    slug: 'agatha-eyes-closed',
    title: 'Agatha eyes closed',
    medium: 'oil on canvas',
    date: '2026',
    image: 'art/agatha-eyes-closed.jpg',
    aspect: 3072 / 3634,
  },
];

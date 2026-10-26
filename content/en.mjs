// English editorial content. Identity, links and section IDs stay shared; captures are English-specific.
export const captureVersion = 'Captured 27 Oct 2026 · Live English interface';
export const siteCopy = {
  shareImage: 'images/share-preview-en.jpg',
  description: 'Turning everyday interests into images and interactions to explore.',
  about: 'This is a home for visual experiments with film, color, and everyday life. Through data and interaction, I look for other ways to see familiar things.'
};
export const projectCopy = {
  title: 'Cinechroma Atlas',
  type: 'Film · Color · Interactive visualization',
  status: 'Live · Interactive',
  description: 'An exploration of a personal film collection, tracing connections between films and following the colors of each film through time.'
};
export const sceneCopy = {
  'atlas-hd-overview': {
    stem: 'atlas-en-hd-overview',
    label: 'Atlas', heading: 'A collection comes into view.',
    description: 'Each star is a film. Its position draws on genre, region, director, and year. Star size reflects connections within this collection, not ratings or personal preference.',
    alt: 'The English film atlas, with genre controls, nodes of different sizes, and short connections within film series.',
    caption: 'Atlas overview · Genre colors'
  },
  'atlas-hd-facets': {
    stem: 'atlas-en-hd-facets',
    label: 'Categories', heading: 'The same map, a different lens.',
    description: 'Switch from genre to region or decade to change the colors while keeping film positions fixed. Use categories and search to find a different way into the collection.',
    alt: 'The English atlas colored by region, with Regions selected and the country legend visible below.',
    caption: 'Regional view · Fixed film positions'
  },
  'atlas-hd-links': {
    stem: 'atlas-en-hd-links',
    label: 'Series', heading: 'A line connects a series of films.',
    description: 'The overview keeps short links within a series. Hovering over or selecting a film reveals more of its series connections. This capture retains the original tour highlight and explanation.',
    alt: 'Step 3 of the live English guide, Series connect the stars, highlighting a series in the lower-right corner.',
    caption: 'Full guide · Series connections · Step 3 of 11'
  },
  'atlas-hd-ring': {
    stem: 'atlas-en-hd-ring',
    label: 'Color ring', heading: 'Time, arranged in a circle.',
    description: 'Time moves clockwise around the ring. Choose a moment on the ring or color strip to update the frame. Film details stay alongside it, giving the colors a specific context.',
    alt: 'Interstellar in the English interface: circular color timeline, sampled frame at 01:17:34, and film details on the right.',
    caption: 'Interstellar · Color ring and frame · 01:17:34'
  },
  'atlas-hd-directors': {
    stem: 'atlas-en-hd-directors',
    label: 'Directors', heading: 'Follow another film by the same director.',
    description: 'Switch to films by the same director and continue along another thread. The list covers titles in this collection, not a complete filmography.',
    alt: 'Interstellar in the English interface with Director selected; Following and Memento are visible in the shared-director list.',
    caption: 'Interstellar · Shared-director films'
  },
  'atlas-hd-charts': {
    stem: 'atlas-en-hd-charts',
    label: 'Color curves', heading: 'See color change over time.',
    description: 'Expand color analysis to see light–dark variation and changes between neighboring color samples. The curves, color strip, and frame share a time position, connecting the whole film to a single moment.',
    alt: 'Interstellar in the English interface beside expanded Brightness and Color change curves, both positioned at 01:17:34.',
    caption: 'Interstellar · Brightness and color-change curves'
  }
};
export const article = {
  slug: 'cinechroma-atlas',
  title: 'Cinechroma Atlas: Mapping a Personal Film Collection',
  excerpt: 'How can a local film collection become an explorable map? Notes on connections between films, circular color timelines, and the boundaries of a personal collection.',
  introduction: 'Sometimes a different arrangement lets us see familiar things anew. Cinechroma Atlas begins with a personal film collection and looks for ways to browse, pause, and explore the connections between films and the colors within them.',
  sections: [
    {
      id: 'starting-point', title: 'Starting with a local collection',
      paragraphs: [
        'The films come from a personal collection stored locally. This is not a list of favorites, and inclusion does not mean that I have watched every film. Nor is it a carefully selected sample of film history. Here, the collection is material that I can keep getting to know.',
        'A file list makes films easy to store and find, but it does little to show the connections between them. Cinechroma Atlas brings film relationships and screen colors into an explorable visual work. It offers a way to move from one film to another, or to stay within a single film and follow its colors through time.'
      ]
    },
    {
      id: 'visual-language', title: 'Between relationships and time',
      paragraphs: [
        'The atlas offers entry points for exploring films in relation to one another. Its layout draws on attributes such as genre, country or region, director, and year. Lines show relationships within a series, confirmed groupings, or shared directors. These are aids to browsing this collection; they do not establish historical influence or causality, and they cannot all be read as color similarity.',
        'Inside a film, a circular color timeline arranges colors in time order. Together with the corresponding frames, it reveals shifts in light, darkness, and tone. The atlas invites the eye outward toward other films; the color timeline brings it back inside one film.'
      ]
    },
    {
      id: 'collection', title: 'A personal collection, with gaps',
      paragraphs: [
        'The collection currently contains {collectionSize}, all drawn from personal local holdings. Its distribution across years is uneven. A director’s work or a film series may be represented by only a few titles.',
        'This is a personal collection and a visual experiment. It does not aim to be a complete film database or a representative sample of film history. A film’s absence is not a judgment of its value. The collection’s limits and gaps are part of the context for understanding the work.'
      ]
    },
    {
      id: 'next', title: 'Letting the work evolve',
      paragraphs: [
        'Further work will focus on gradually correcting film information, improving the mobile browsing experience, and adding a small number of films as my interests develop, while preserving the experience of the work.',
        'There is no fixed schedule and no promise of complete coverage. I would rather keep a personal rhythm of observation and exploration, letting the work become clearer and easier to use through use.'
      ]
    }
  ]
};

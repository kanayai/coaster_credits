
export const fetchCoasterImageFromWiki = async (coasterName: string, parkName: string): Promise<string | null> => {
  
  const fetchImage = async (query: string): Promise<string | null> => {
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json&generator=search&gsrnamespace=0&gsrlimit=5&gsrsearch=${encodeURIComponent(query)}&prop=pageimages&pithumbsize=900`;
        const res = await fetch(searchUrl);
        const data = await res.json();

        if (data.query && data.query.pages) {
            const pages = Object.values(data.query.pages) as any[];
            const withThumb = pages.find((page) => page?.thumbnail?.source);
            if (withThumb?.thumbnail?.source) return withThumb.thumbnail.source;
        }
        return null;
      } catch (error) {
        console.warn(`Wiki fetch failed for query "${query}":`, error);
        return null;
      }
  };

  try {
    // 1. Try specific search (Name + Park + roller coaster)
    // This is most accurate but fails if park name in DB differs slightly from Wiki
    let image = await fetchImage(`${coasterName} ${parkName} roller coaster`);
    
    // 2. Fallback: Try just Name + roller coaster
    // High success rate for unique coaster names
    if (!image) {
        image = await fetchImage(`${coasterName} roller coaster`);
    }

    // 3. Fallback: name + park without keyword
    if (!image) {
      image = await fetchImage(`${coasterName} ${parkName}`);
    }

    // 4. Fallback: just coaster name
    if (!image) {
      image = await fetchImage(`${coasterName}`);
    }

    return image;
  } catch (error) {
    console.error("Wiki Service Error:", error);
    return null;
  }
};

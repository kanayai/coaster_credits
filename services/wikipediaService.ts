
export const fetchCoasterImageFromWiki = async (coasterName: string, parkName: string): Promise<string | null> => {
  
  const fetchImage = async (query: string): Promise<string | null> => {
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json&generator=search&gsrnamespace=0&gsrlimit=1&gsrsearch=${encodeURIComponent(query)}&prop=pageimages&pithumbsize=600`;
        const res = await fetch(searchUrl);
        const data = await res.json();

        if (data.query && data.query.pages) {
            const pages = Object.values(data.query.pages);
            if (pages.length > 0) {
                const page = pages[0] as any;
                if (page.thumbnail && page.thumbnail.source) {
                    return page.thumbnail.source;
                }
            }
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

    return image;
  } catch (error) {
    console.error("Wiki Service Error:", error);
    return null;
  }
};

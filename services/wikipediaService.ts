
export const fetchCoasterImageFromWiki = async (coasterName: string, parkName: string): Promise<string | null> => {
  try {
    // 1. Search for the page
    const searchQuery = `${coasterName} ${parkName} roller coaster`;
    const searchUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json&generator=search&gsrnamespace=0&gsrlimit=1&gsrsearch=${encodeURIComponent(searchQuery)}&prop=pageimages&pithumbsize=600`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.query || !searchData.query.pages) {
      return null;
    }

    // Get the first page result
    const pages = Object.values(searchData.query.pages);
    if (pages.length > 0) {
      const page = pages[0] as any;
      if (page.thumbnail && page.thumbnail.source) {
        return page.thumbnail.source;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Wiki Image Fetch Error:", error);
    return null;
  }
};

// Cover Color Extraction Utility
const COLOR_CACHE_KEY = 'musicPlayerCoverColors';
const COLOR_CACHE_VERSION = 'v2';

let colorCache: Record<string, string> = {};

export function loadColorCache() {
    try {
        const cached = localStorage.getItem(COLOR_CACHE_KEY);
        const version = localStorage.getItem(COLOR_CACHE_KEY + '_version');
        
        if (cached && version === COLOR_CACHE_VERSION) {
            colorCache = JSON.parse(cached);
        } else {
            colorCache = {};
            localStorage.removeItem(COLOR_CACHE_KEY);
            localStorage.setItem(COLOR_CACHE_KEY + '_version', COLOR_CACHE_VERSION);
        }
    } catch (e) {
        console.error('Failed to load color cache:', e);
    }
}

export function saveColorCache() {
    try {
        localStorage.setItem(COLOR_CACHE_KEY, JSON.stringify(colorCache));
    } catch (e) {
        console.error('Failed to save color cache:', e);
    }
}

export async function extractCoverColor(imageUrl: string): Promise<string> {
    if (colorCache[imageUrl]) {
        return colorCache[imageUrl];
    }
    
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = 100;
                canvas.height = 100;
                
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Sample center region
                const centerSize = 40;
                const startX = (canvas.width - centerSize) / 2;
                const startY = (canvas.height - centerSize) / 2;
                
                const imageData = ctx?.getImageData(startX, startY, centerSize, centerSize);
                const data = imageData?.data;
                
                if (!data) {
                    resolve('35, 55, 255');
                    return;
                }
                
                let r = 0, g = 0, b = 0, totalWeight = 0;
                
                for (let i = 0; i < data.length; i += 4) {
                    const pixelR = data[i];
                    const pixelG = data[i + 1];
                    const pixelB = data[i + 2];
                    
                    const max = Math.max(pixelR, pixelG, pixelB);
                    const min = Math.min(pixelR, pixelG, pixelB);
                    const saturation = max === 0 ? 0 : (max - min) / max;
                    
                    const weight = 0.3 + saturation * 0.7;
                    
                    r += pixelR * weight;
                    g += pixelG * weight;
                    b += pixelB * weight;
                    totalWeight += weight;
                }
                
                if (totalWeight > 0) {
                    r = Math.round(r / totalWeight);
                    g = Math.round(g / totalWeight);
                    b = Math.round(b / totalWeight);
                } else {
                    r = 35; g = 55; b = 255;
                }
                
                const color = `${r}, ${g}, ${b}`;
                colorCache[imageUrl] = color;
                saveColorCache();
                
                resolve(color);
            } catch (e) {
                console.error('Failed to extract color:', e);
                resolve('35, 55, 255');
            }
        };
        
        img.onerror = () => {
            resolve('35, 55, 255');
        };
        
        img.src = imageUrl;
    });
}

export function updatePulseColor(imageUrl: string | null, button: HTMLElement | null) {
    if (!imageUrl || !button) {
        button?.style.setProperty('--pulse-color', '35, 55, 255');
        return Promise.resolve();
    }
    
    return extractCoverColor(imageUrl).then(color => {
        button.style.setProperty('--pulse-color', color);
    });
}

// Initialize cache on module load
loadColorCache();

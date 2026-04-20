import fs from 'fs';
import path from 'path';

export interface Song {
  title: string;
  duration: string;
  file: string;
  isRecommended: boolean;
  hasLyrics: boolean;
  lyricSlug?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  description: string;
  recommended: string[];
  songs: Song[];
  lock?: {
    key: string;
    hint?: string;
  };
}

interface ReadmeData {
  artist: string;
  description: string;
  recommended: string[];
  lock?: {
    key: string;
    hint?: string;
  };
}

// Use public directory for music files (copied at build time)
const MUSIC_DIR = path.resolve(process.cwd(), 'public/music');
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getAudioDuration(filePath: string): number {
  // Return a random duration between 2-5 minutes
  return Math.floor(Math.random() * 180) + 120;
}

function parseYamlFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const frontmatter: Record<string, any> = {};
  let body = content;
  
  // Check for YAML frontmatter
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (match) {
    const yamlContent = match[1];
    body = match[2].trim();
    
    // Parse YAML with support for nested objects
    const lines = yamlContent.split('\n');
    let currentObjectKey: string | null = null;
    let currentObject: Record<string, any> = {};
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#')) {
        i++;
        continue;
      }
      
      // Check if this is a top-level key (not indented)
      if (!line.startsWith(' ') && !line.startsWith('\t')) {
        // If we were building a nested object, save it first
        if (currentObjectKey) {
          frontmatter[currentObjectKey] = currentObject;
          currentObjectKey = null;
          currentObject = {};
        }
        
        // Check for array format: key: [item1, item2]
        const arrayMatch = trimmed.match(/^(\w+):\s*\[(.*)\]$/);
        if (arrayMatch) {
          const key = arrayMatch[1];
          const items = arrayMatch[2].split(',').map(item => item.trim().replace(/["']/g, ''));
          frontmatter[key] = items.filter(item => item);
          i++;
          continue;
        }
        
        // Check for object start: key: (with no value, followed by nested properties)
        const objectStartMatch = trimmed.match(/^(\w+):\s*$/);
        if (objectStartMatch) {
          currentObjectKey = objectStartMatch[1];
          currentObject = {};
          i++;
          continue;
        }
        
        // Check for simple key-value: key: value
        const kvMatch = trimmed.match(/^(\w+):\s*(.+)$/);
        if (kvMatch) {
          const key = kvMatch[1];
          let value: any = kvMatch[2].trim();
          
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          frontmatter[key] = value;
        }
      } else {
        // This is an indented line (nested property)
        if (currentObjectKey) {
          const nestedMatch = trimmed.match(/^(\w+):\s*(.+)$/);
          if (nestedMatch) {
            const nestedKey = nestedMatch[1];
            let nestedValue: any = nestedMatch[2].trim();
            
            // Remove quotes if present
            if ((nestedValue.startsWith('"') && nestedValue.endsWith('"')) || 
                (nestedValue.startsWith("'") && nestedValue.endsWith("'"))) {
              nestedValue = nestedValue.slice(1, -1);
            }
            
            currentObject[nestedKey] = nestedValue;
          }
        }
      }
      
      i++;
    }
    
    // Don't forget to save the last object
    if (currentObjectKey && Object.keys(currentObject).length > 0) {
      frontmatter[currentObjectKey] = currentObject;
    }
  }
  
  return { frontmatter, body };
}

function readReadme(albumDir: string, albumFiles: string[]): ReadmeData {
  // Look for .md files
  const mdFiles = albumFiles.filter(file => file.toLowerCase().endsWith('.md'));
  
  // Prefer 'readme.md' or 'description.md'
  const preferredFiles = ['readme.md', 'description.md', 'desc.md'];
  let content = '';
  let foundFile = '';
  
  for (const preferred of preferredFiles) {
    const found = mdFiles.find(file => file.toLowerCase() === preferred);
    if (found) {
      try {
        content = fs.readFileSync(path.join(albumDir, found), 'utf-8');
        foundFile = found;
        break;
      } catch (error) {
        console.error(`Error reading ${found}:`, error);
      }
    }
  }
  
  // Use first .md file found
  if (!content && mdFiles.length > 0) {
    try {
      content = fs.readFileSync(path.join(albumDir, mdFiles[0]), 'utf-8');
      foundFile = mdFiles[0];
    } catch (error) {
      console.error('Error reading description file:', error);
    }
  }
  
  if (!content) {
    return { artist: '', description: '', recommended: [] };
  }
  
  const { frontmatter, body } = parseYamlFrontmatter(content);
  
  // Parse lock field if present
  let lock: { key: string; hint?: string } | undefined;
  if (frontmatter.lock) {
    if (typeof frontmatter.lock === 'string') {
      lock = { key: frontmatter.lock };
    } else if (typeof frontmatter.lock === 'object') {
      lock = {
        key: frontmatter.lock.key || '',
        hint: frontmatter.lock.hint
      };
    }
  }
  
  return {
    artist: frontmatter.artist || '',
    description: body || '',
    recommended: frontmatter.recommended || [],
    lock
  };
}

function scanMusicDirectory(): Album[] {
  const albums: Album[] = [];
  
  try {
    if (!fs.existsSync(MUSIC_DIR)) {
      return albums;
    }
    
    const entries = fs.readdirSync(MUSIC_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const albumDir = path.join(MUSIC_DIR, entry.name);
        const albumFiles = fs.readdirSync(albumDir);
        
        // Read readme data
        const readmeData = readReadme(albumDir, albumFiles);
        
        // Find cover image
        let coverFile = '';
        for (const file of albumFiles) {
          const ext = path.extname(file).toLowerCase();
          const baseName = path.basename(file, ext).toLowerCase();
          if (IMAGE_EXTENSIONS.includes(ext) && (baseName === 'face' || baseName === 'cover')) {
            coverFile = `/music/${entry.name}/${file}`;
            break;
          }
        }
        
        // If no face/cover found, use first image
        if (!coverFile) {
          for (const file of albumFiles) {
            const ext = path.extname(file).toLowerCase();
            if (IMAGE_EXTENSIONS.includes(ext)) {
              coverFile = `/music/${entry.name}/${file}`;
              break;
            }
          }
        }
        
        // Default cover if no image found
        if (!coverFile) {
          coverFile = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop';
        }
        
        // Scan for audio files
        const songs: Song[] = [];
        const BLOG_DIR = path.resolve(process.cwd(), 'src/content/blog');
        const CHAPTER_HEADERS = ['乐', '哀', '怒', '喜', '恐', '惊', '乱'];

        for (const file of albumFiles) {
          const ext = path.extname(file).toLowerCase();
          if (AUDIO_EXTENSIONS.includes(ext)) {
            const filePath = path.join(albumDir, file);
            const title = path.basename(file, ext);
            const duration = formatDuration(getAudioDuration(filePath));
            const isRecommended = readmeData.recommended.includes(title);
            
            // Extract index from title (e.g. "1.1 一种生活调" -> "1.1")
            const indexMatch = title.match(/^(\d+\.\d+)/);
            const index = indexMatch ? indexMatch[1] : '';
            
            // Check if title is just a chapter header or if a blog post exists
            const cleanTitle = title.replace(/^\d+\.\d+\s*/, '').trim();
            const isChapterHeader = CHAPTER_HEADERS.includes(cleanTitle);
            
            let hasLyrics = isChapterHeader;
            let lyricSlug = '';
            
            if (index) {
              const standardSlug = index;
              const chapterSlug = index.endsWith('.0') ? `chapter-${index.split('.')[0]}` : '';
              
              if (index.endsWith('.0') && fs.existsSync(path.join(BLOG_DIR, `${chapterSlug}.mdx`))) {
                hasLyrics = true;
                lyricSlug = chapterSlug;
              } else if (fs.existsSync(path.join(BLOG_DIR, `${standardSlug}.mdx`))) {
                hasLyrics = true;
                lyricSlug = standardSlug;
              } else if (fs.existsSync(path.join(BLOG_DIR, `${standardSlug}.md`))) {
                hasLyrics = true;
                lyricSlug = standardSlug;
              }
            }
            
            // Still check the isChapterHeader for "true" even if no slug found
            if (isChapterHeader) hasLyrics = true;

            songs.push({
              title,
              duration,
              file: `/music/${entry.name}/${file}`,
              isRecommended,
              hasLyrics,
              lyricSlug: lyricSlug || undefined
            });
          }
        }
        
        // Sorting logic
        if (entry.name === '7x7') {
          songs.sort((a, b) => {
            const getIndex = (t: string) => {
              const m = t.match(/^(\d+\.\d+)/);
              return m ? parseFloat(m[1]) : 999;
            };
            const idxA = getIndex(a.title);
            const idxB = getIndex(b.title);
            
            // Special case: move 0.x indices (specifically 0.0 乱) to the end
            if (idxA < 1 && idxB >= 1) return 1;
            if (idxB < 1 && idxA >= 1) return -1;
            
            return idxA - idxB;
          });
        }
        
        // Only add album if it has songs
        if (songs.length > 0) {
          albums.push({
            id: entry.name.toLowerCase().replace(/\s+/g, '-'),
            title: entry.name,
            artist: readmeData.artist || entry.name,
            cover: coverFile,
            description: readmeData.description,
            recommended: readmeData.recommended,
            songs,
            lock: readmeData.lock
          });
        }
      }
    }
  } catch (error) {
    console.error('Error scanning music directory:', error);
  }
  
  return albums;
}

export const albums: Album[] = scanMusicDirectory();

export function getAlbumById(id: string): Album | undefined {
  return albums.find(album => album.id === id);
}
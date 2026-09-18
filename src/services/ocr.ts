

import vision from '@google-cloud/vision';
import sharp from 'sharp';
import { ImageQuality } from '../types';

const client = new vision.ImageAnnotatorClient();

export interface OcrResult {
  
  candidates: string[];
  
  rawText: string;
  
  confidence: number;
  
  imageQuality: ImageQuality;
}

async function preprocessImage(
  imageBuffer: Buffer
): Promise<{ buffer: Buffer; width: number; height: number; brightness: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  const stats = await sharp(imageBuffer).stats();
  const brightness = stats.channels[0]?.mean || 128;

  const processed = await sharp(imageBuffer)
    .resize({
      width: 2048,
      height: 2048,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  return { buffer: processed, width, height, brightness };
}

function assessImageQuality(
  width: number,
  height: number,
  brightness: number
): ImageQuality {
  return {
    brightness:
      brightness < 50 ? 'too_dark' :
      brightness > 220 ? 'too_bright' :
      'adequate',
    sharpness:
      width < 640 || height < 480 ? 'blurry' :
      width < 1200 ? 'acceptable' :
      'good',
    resolution:
      width < 640 || height < 480 ? 'too_small' :
      width < 1200 ? 'acceptable' :
      'good',
  };
}

function extractCandidates(rawText: string): string[] {
  
  const cleanText = rawText.replace(/[^\d\s]/g, ' ');

  const candidates: string[] = [];

  const exactMatches = cleanText.match(/(?<!\d)\d{10}(?!\d)/g);
  if (exactMatches) {
    candidates.push(...exactMatches);
  }

  if (candidates.length === 0) {
    const digitGroups = cleanText.match(/\d+/g);
    if (digitGroups) {
      
      const allDigits = digitGroups.join('');
      const combined = allDigits.match(/(?<!\d)\d{10}(?!\d)/g);
      if (combined) {
        candidates.push(...combined);
      }

      if (candidates.length === 0 && allDigits.length >= 10) {
        for (let i = 0; i <= allDigits.length - 10; i++) {
          candidates.push(allDigits.slice(i, i + 10));
        }
      }
    }
  }

  return [...new Set(candidates)];
}

export async function recognizeImage(imageBuffer: Buffer): Promise<OcrResult> {
  
  const { buffer, width, height, brightness } = await preprocessImage(imageBuffer);

  const [result] = await client.documentTextDetection(buffer);
  
  const annotations = result.textAnnotations;
  const rawText = annotations && annotations.length > 0 ? annotations[0].description || '' : '';

  let confidence = 0;
  if (result.fullTextAnnotation && result.fullTextAnnotation.pages) {
    let totalConfidence = 0;
    let wordCount = 0;
    for (const page of result.fullTextAnnotation.pages) {
      for (const block of page.blocks || []) {
        for (const paragraph of block.paragraphs || []) {
          for (const word of paragraph.words || []) {
            totalConfidence += word.confidence || 0;
            wordCount++;
          }
        }
      }
    }
    confidence = wordCount > 0 ? totalConfidence / wordCount : 0.9;
  } else if (rawText) {
    confidence = 0.9; 
  }

  const candidates = extractCandidates(rawText);
  const imageQuality = assessImageQuality(width, height, brightness);

  return {
    candidates,
    rawText,
    confidence,
    imageQuality,
  };
}

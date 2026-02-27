/**
 * Question Library Service
 * Manages the question library - import/export questions, templates, and guidelines
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

const LIBRARY_PATH_CANDIDATES = [
  // PM2 production run (backend cwd)
  path.resolve(process.cwd(), '../question-library'),
  // Local dev run from repo root
  path.resolve(process.cwd(), 'question-library'),
  // Source path (`backend/src/services`)
  path.resolve(__dirname, '../../../../question-library'),
  // Compiled path (`backend/dist/src/services`)
  path.resolve(__dirname, '../../../../../question-library'),
];

const LIBRARY_PATH =
  LIBRARY_PATH_CANDIDATES.find((candidate) => existsSync(candidate)) ??
  LIBRARY_PATH_CANDIDATES[0];

export interface QuestionTemplate {
  title: string;
  category: string;
  difficulty: string;
  points: number;
  timeLimit: number;
  description: string;
  testConfig: any;
  starterCode?: any;
  hints?: string[];
  tags?: string[];
}

/**
 * Get all available templates
 */
export async function getTemplates(language?: string): Promise<any[]> {
  const templatesPath = path.join(LIBRARY_PATH, 'templates');
  const templates: any[] = [];

  try {
    if (language) {
      // Get templates for specific language
      const langPath = path.join(templatesPath, language);
      const files = await fs.readdir(langPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(langPath, file), 'utf-8');
          templates.push({
            language,
            name: file.replace('.json', ''),
            template: JSON.parse(content)
          });
        }
      }
    } else {
      // Get all templates
      const languages = await fs.readdir(templatesPath);
      
      for (const lang of languages) {
        const langPath = path.join(templatesPath, lang);
        const stat = await fs.stat(langPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(langPath);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const content = await fs.readFile(path.join(langPath, file), 'utf-8');
              templates.push({
                language: lang,
                name: file.replace('.json', ''),
                template: JSON.parse(content)
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading templates:', error);
  }

  return templates;
}

/**
 * Get sample questions by difficulty
 */
export async function getSamples(difficulty?: string): Promise<any[]> {
  const samplesPath = path.join(LIBRARY_PATH, 'samples');
  const samples: any[] = [];

  try {
    if (difficulty) {
      // Get samples for specific difficulty
      const diffPath = path.join(samplesPath, difficulty);
      const files = await fs.readdir(diffPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(diffPath, file), 'utf-8');
          samples.push({
            difficulty,
            name: file.replace('.json', ''),
            question: JSON.parse(content)
          });
        }
      }
    } else {
      // Get all samples
      const difficulties = await fs.readdir(samplesPath);
      
      for (const diff of difficulties) {
        const diffPath = path.join(samplesPath, diff);
        const stat = await fs.stat(diffPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(diffPath);
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const content = await fs.readFile(path.join(diffPath, file), 'utf-8');
              samples.push({
                difficulty: diff,
                name: file.replace('.json', ''),
                question: JSON.parse(content)
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading samples:', error);
  }

  return samples;
}

/**
 * Get guidelines documentation
 */
export async function getGuidelines(): Promise<any> {
  const guidelinesPath = path.join(LIBRARY_PATH, 'guidelines');
  const guidelines: any = {};

  try {
    const files = await fs.readdir(guidelinesPath);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(guidelinesPath, file), 'utf-8');
        const name = file.replace('.md', '');
        guidelines[name] = content;
      }
    }
  } catch (error) {
    console.error('Error reading guidelines:', error);
  }

  return guidelines;
}

/**
 * Import question from library to database
 */
export async function importQuestionFromLibrary(
  db: any,
  libraryPath: string,
  userId: string,
  organizationId: string
): Promise<any> {
  try {
    const sanitized = String(libraryPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!sanitized) throw new Error('Invalid library path');
    if (sanitized.includes('..')) throw new Error('Invalid library path');
    const fullPath = path.resolve(LIBRARY_PATH, sanitized);
    if (!fullPath.startsWith(path.resolve(LIBRARY_PATH))) throw new Error('Invalid library path');

    const content = await fs.readFile(fullPath, 'utf-8');
    const questionData = JSON.parse(content);

    // Create question in database
    const result = await db.insertInto('questions')
      .values({
        title: questionData.title,
        category: questionData.category,
        difficulty: questionData.difficulty,
        points: questionData.points,
        time_limit: questionData.timeLimit,
        description: questionData.description,
        test_config: JSON.stringify(questionData.testConfig),
        starter_code: questionData.starterCode ? JSON.stringify(questionData.starterCode) : null,
        hints: questionData.hints ? JSON.stringify(questionData.hints) : null,
        tags: questionData.tags ? JSON.stringify(questionData.tags) : null,
        status: 'draft',
        created_by: userId,
        organization_id: organizationId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning(['id', 'title'])
      .executeTakeFirst();

    return result;
  } catch (error) {
    throw new Error(`Failed to import question: ${(error as any).message}`);
  }
}

/**
 * Export question to library
 */
export async function exportQuestionToLibrary(
  db: any,
  questionId: string,
  exportPath: string
): Promise<string> {
  try {
    // Get question from database
    const question = await db.selectFrom('questions')
      .selectAll()
      .where('id', '=', questionId)
      .executeTakeFirst();

    if (!question) {
      throw new Error('Question not found');
    }

    // Format for export
    const exportData: QuestionTemplate = {
      title: question.title,
      category: question.category,
      difficulty: question.difficulty,
      points: question.points,
      timeLimit: question.time_limit,
      description: question.description,
      testConfig: typeof question.test_config === 'string' 
        ? JSON.parse(question.test_config) 
        : question.test_config,
      starterCode: question.starter_code 
        ? (typeof question.starter_code === 'string' ? JSON.parse(question.starter_code) : question.starter_code)
        : undefined,
      hints: question.hints 
        ? (typeof question.hints === 'string' ? JSON.parse(question.hints) : question.hints)
        : undefined,
      tags: question.tags 
        ? (typeof question.tags === 'string' ? JSON.parse(question.tags) : question.tags)
        : undefined
    };

    // Write to file
    const fullPath = path.join(LIBRARY_PATH, exportPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(exportData, null, 2), 'utf-8');

    return fullPath;
  } catch (error) {
    throw new Error(`Failed to export question: ${error.message}`);
  }
}

/**
 * Get library statistics
 */
export async function getLibraryStats(): Promise<any> {
  try {
    const templates = await getTemplates();
    const samples = await getSamples();
    const guidelines = await getGuidelines();

    const templatesByLanguage = templates.reduce((acc, t) => {
      acc[t.language] = (acc[t.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const samplesByDifficulty = samples.reduce((acc, s) => {
      acc[s.difficulty] = (acc[s.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTemplates: templates.length,
      totalSamples: samples.length,
      totalGuidelines: Object.keys(guidelines).length,
      templatesByLanguage,
      samplesByDifficulty,
      languages: Object.keys(templatesByLanguage),
      difficulties: Object.keys(samplesByDifficulty)
    };
  } catch (error) {
    console.error('Error getting library stats:', error);
    return {
      totalTemplates: 0,
      totalSamples: 0,
      totalGuidelines: 0,
      templatesByLanguage: {},
      samplesByDifficulty: {},
      languages: [],
      difficulties: []
    };
  }
}

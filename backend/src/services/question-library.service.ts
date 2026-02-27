/**
 * Question Library Service
 * Manages the question library - import/export questions, templates, and guidelines
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { createQuestion } from './question.service';

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

function normalizeDifficulty(input: string): 'easy' | 'medium' | 'hard' {
  const value = String(input || '').toLowerCase().trim();
  if (value === 'beginner' || value === 'easy') return 'easy';
  if (value === 'intermediate' || value === 'medium') return 'medium';
  if (value === 'advanced' || value === 'hard') return 'hard';
  return 'medium';
}

function normalizeCategory(input: string): 'frontend' | 'backend' | 'fullstack' | 'database' | 'devops' {
  const value = String(input || '').toLowerCase().trim();
  if (value === 'frontend' || value === 'backend' || value === 'fullstack' || value === 'database' || value === 'devops') {
    return value;
  }
  if (value === 'algorithms' || value === 'dsa') return 'backend';
  if (value === 'sql' || value === 'data') return 'database';
  return 'backend';
}

function normalizeStarterCode(starterCode: any) {
  const files = Array.isArray(starterCode?.files) ? starterCode.files : [];
  return {
    files: files.map((f: any) => ({
      path: f.path || f.name || 'solution.js',
      content: String(f.content || ''),
      language: f.language
    })),
    dependencies: starterCode?.dependencies && typeof starterCode.dependencies === 'object' ? starterCode.dependencies : {},
    scripts: starterCode?.scripts && typeof starterCode.scripts === 'object' ? starterCode.scripts : undefined,
    devDependencies: starterCode?.devDependencies && typeof starterCode.devDependencies === 'object' ? starterCode.devDependencies : undefined
  };
}

function buildNormalizedQuestionDto(questionData: any) {
  const framework = String(questionData?.testConfig?.framework || questionData?.testFramework || 'jest').toLowerCase();
  const testCases = Array.isArray(questionData?.testConfig?.testCases) ? questionData.testConfig.testCases : [];
  const totalPoints = testCases.reduce((sum: number, tc: any) => sum + Number(tc?.points || 0), 0);

  return {
    title: String(questionData?.title || 'Imported Library Question'),
    description: String(questionData?.description || 'Imported from library'),
    category: normalizeCategory(questionData?.category),
    subcategory: [],
    difficulty: normalizeDifficulty(questionData?.difficulty),
    skills: Array.isArray(questionData?.skills) ? questionData.skills : [],
    tags: Array.isArray(questionData?.tags) ? questionData.tags : [],
    starterCode: normalizeStarterCode(questionData?.starterCode),
    testFramework: framework,
    testConfig: {
      framework,
      version: '1.0.0',
      environment: questionData?.testConfig?.environment || { node: '18' },
      setup: questionData?.testConfig?.setup || { commands: ['npm install'] },
      execution: {
        command: questionData?.testConfig?.execution?.command || 'npm test',
        timeout: Number(questionData?.testConfig?.execution?.timeout || 30000),
        retries: Number(questionData?.testConfig?.execution?.retries || 0),
        parallelism: Boolean(questionData?.testConfig?.execution?.parallelism ?? false)
      },
      testCases: testCases.map((tc: any, idx: number) => ({
        id: tc?.id || `tc_${idx + 1}`,
        name: tc?.name || `Test ${idx + 1}`,
        description: tc?.description,
        file: tc?.file || 'test.spec.js',
        testName: tc?.testName || tc?.name || `Test ${idx + 1}`,
        testCode: tc?.testCode,
        points: Number(tc?.points || 0),
        visible: Boolean(tc?.visible ?? true),
        category: tc?.category,
        timeout: tc?.timeout ? Number(tc.timeout) : undefined
      })),
      scoring: questionData?.testConfig?.scoring || {
        total: totalPoints > 0 ? totalPoints : Number(questionData?.points || 100),
        passing: Math.max(1, Math.ceil((totalPoints > 0 ? totalPoints : Number(questionData?.points || 100)) * 0.6))
      }
    },
    solution: questionData?.solution,
    timeEstimate: Number(questionData?.timeEstimate || questionData?.timeLimit || 30),
    points: Number(questionData?.points || 100)
  };
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

    const dto = buildNormalizedQuestionDto(questionData);
    const created = await createQuestion(db, dto as any, {
      organizationId,
      userId,
      userRole: 'admin'
    });

    return { id: created.id, title: created.title };
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

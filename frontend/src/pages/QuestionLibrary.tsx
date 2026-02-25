import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book, FileText, Download, Upload, BarChart3 } from 'lucide-react';

interface LibraryStats {
  totalTemplates: number;
  totalSamples: number;
  totalGuidelines: number;
  templatesByLanguage: Record<string, number>;
  samplesByDifficulty: Record<string, number>;
}

export function QuestionLibrary() {
  const [activeTab, setActiveTab] = useState<'templates' | 'samples' | 'guidelines'>('templates');
  const [templates, setTemplates] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [guidelines, setGuidelines] = useState<any>({});
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = async () => {
    try {
      const [templatesRes, samplesRes, guidelinesRes, statsRes] = await Promise.all([
        fetch('/api/v1/library/templates'),
        fetch('/api/v1/library/samples'),
        fetch('/api/v1/library/guidelines'),
        fetch('/api/v1/library/stats')
      ]);

      const templatesData = await templatesRes.json();
      const samplesData = await samplesRes.json();
      const guidelinesData = await guidelinesRes.json();
      const statsData = await statsRes.json();

      setTemplates(templatesData.data || []);
      setSamples(samplesData.data || []);
      setGuidelines(guidelinesData.data || {});
      setStats(statsData.data);
    } catch (error) {
      console.error('Failed to load library data:', error);
    } finally {
      setLoading(false);
    }
  };

  const importQuestion = async (libraryPath: string) => {
    try {
      const response = await fetch('/api/v1/library/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libraryPath })
      });

      if (response.ok) {
        alert('Question imported successfully!');
      }
    } catch (error) {
      console.error('Failed to import question:', error);
      alert('Failed to import question');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Question Library</h1>
        <p className="text-gray-600 mt-1">
          Browse templates, samples, and guidelines for creating quality questions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Templates</p>
              <p className="text-3xl font-bold mt-1">{stats?.totalTemplates || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sample Questions</p>
              <p className="text-3xl font-bold mt-1">{stats?.totalSamples || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Guidelines</p>
              <p className="text-3xl font-bold mt-1">{stats?.totalGuidelines || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Book className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'samples'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sample Questions ({samples.length})
          </button>
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'guidelines'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Guidelines ({Object.keys(guidelines).length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template, index) => (
            <div key={index} className="card hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold">{template.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">Language: {template.language}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {template.template.description?.substring(0, 100)}...
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => importQuestion(`templates/${template.language}/${template.name}.json`)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Use Template
                </button>
                <button className="btn-secondary text-sm">
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'samples' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {samples.map((sample, index) => (
            <div key={index} className="card hover:shadow-lg transition">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    sample.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                    sample.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {sample.difficulty}
                  </span>
                  <span className="text-sm text-gray-500">{sample.question.points} points</span>
                </div>
                <h3 className="font-semibold">{sample.question.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{sample.question.category}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {sample.question.description?.substring(0, 100)}...
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => importQuestion(`samples/${sample.difficulty}/${sample.name}.json`)}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>
                <button className="btn-secondary text-sm">
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'guidelines' && (
        <div className="grid grid-cols-1 gap-4">
          {Object.entries(guidelines).map(([name, content]) => (
            <div key={name} className="card">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Book className="w-5 h-5 text-blue-600" />
                {name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </h3>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                  {(content as string).substring(0, 500)}...
                </pre>
              </div>
              <button className="mt-4 btn-secondary text-sm">
                View Full Guidelines
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

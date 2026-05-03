import { useState, useEffect } from 'react';
import API from '../services/api';

const AdminSummaryGenerator = () => {
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get('/issues');
      setIssues(response.data);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    }
  };

  const generateSummary = async (issueId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await API.get(`/summary/issues/${issueId}/summary`);
      setSummary(response.data.data.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueSelect = (issue) => {
    setSelectedIssue(issue);
    generateSummary(issue._id);
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Generate Issue Summary</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Select an Issue</h2>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {issues.map((issue) => (
              <button
                key={issue._id}
                onClick={() => handleIssueSelect(issue)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                  selectedIssue?._id === issue._id ? 'bg-blue-50' : ''
                }`}
              >
                <h3 className="font-semibold text-gray-800">{issue.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {issue.upvoteCount} upvotes • {issue.commentCount} comments • Status: {issue.status}
                </p>
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Generated Summary</h2>
          {loading ? (
            <div className="text-center py-8">Generating summary...</div>
          ) : summary ? (
            <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap font-mono text-sm">
              {summary}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Select an issue to generate a summary</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSummaryGenerator;
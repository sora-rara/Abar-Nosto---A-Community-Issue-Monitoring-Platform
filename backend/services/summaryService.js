const generateIssueSummary = (issue) => {
  const priority = issue.upvoteCount > 10 ? 'High' : issue.upvoteCount > 5 ? 'Medium' : 'Low';
  const summary = `
    Issue: ${issue.title}
    Category: ${issue.category}
    Priority: ${priority} (based on ${issue.upvoteCount} upvotes)
    Status: ${issue.status}
    Description: ${issue.description.substring(0, 200)}...
    Reported: ${new Date(issue.createdAt).toLocaleDateString()}
    Last Activity: ${new Date(issue.lastActivityAt).toLocaleDateString()}
  `;
  return summary.trim();
};

module.exports = { generateIssueSummary };
import { Box, Typography, Paper, Chip } from '@mui/material';

function ConversationAnalysis({ conversationHistory }) {
  return (
    <Box sx={{
      flex: 1,
      bgcolor: '#f8f9fa',
      borderRadius: 2,
      p: 2,
      overflowY: 'auto'
    }}>
      <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
        Conversation Analysis
      </Typography>
      {conversationHistory.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {conversationHistory.map((item, index) => (
            <Paper key={index} sx={{ p: 2, bgcolor: 'white' }}>
              {item.type === 'student' ? (
                <>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Student Response Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Processed Answer: {item.processed_answer}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Reference Answer: {item.reference_answer}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Interviewer Question Analysis
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {/* Bloom's Level Tag */}
                    <Chip
                      label={item.bloom_level}
                      size="small"
                      sx={{
                        bgcolor: item.bloom_level === 'Analyze' ? '#e8f5e9' : '#fff3e0',
                        color: item.bloom_level === 'Analyze' ? '#2e7d32' : '#ef6c00',
                        fontWeight: 'medium',
                        '&:hover': {
                          bgcolor: item.bloom_level === 'Analyze' ? '#c8e6c9' : '#ffe0b2'
                        }
                      }}
                    />
                    {/* Concept Tags */}
                    {item.concepts.map((concept, idx) => (
                      <Chip
                        key={idx}
                        label={concept.name}
                        size="small"
                        sx={{
                          bgcolor: '#e3f2fd',
                          color: '#1976d2',
                          '&:hover': {
                            bgcolor: '#bbdefb'
                          }
                        }}
                      />
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Rationale: {item.rationale}
                  </Typography>
                </>
              )}
            </Paper>
          ))}
        </Box>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" component="div">
            This section will show analysis of the conversation:
          </Typography>
          <ul style={{ marginLeft: '20px', marginTop: '8px', color: 'text.secondary' }}>
            <li>Student response analysis</li>
            <li>Interviewer question analysis</li>
            <li>Concept coverage</li>
            <li>Learning progress</li>
          </ul>
        </>
      )}
    </Box>
  );
}

export default ConversationAnalysis;
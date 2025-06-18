import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, Paper, TextField, Button } from '@mui/material';
import Editor from '@monaco-editor/react';
import { logger } from '../logger';

const API_URL = import.meta.env.VITE_FLASK_APP_URL;

function NewInterviewPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('// Write your code here\n');
  const [problemStatement, setProblemStatement] = useState('');
  const [error, setError] = useState(null);

  const handleEditorChange = (value) => {
    setCode(value);
  };

  const handleSubmit = async () => {
    try {
      logger.info('Submitting new interview data...');
      const response = await fetch(`${API_URL}/api/interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({
          submitted_code: code,
          submitted_problem: problemStatement
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create interview');
      }

      const data = await response.json();
      logger.info('Interview created successfully, id:', data.interview_id);
      navigate(`/interview/${data.interview_id}`);
    } catch (err) {
      setError(err.message);
      console.error('Error creating interview:', err);
    }
  };

  if (error) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: 'error.main'
      }}>
        <Typography variant="h6">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      flexGrow: 1,
      height: '100%',
      overflow: 'hidden',
      bgcolor: '#fff'
    }}>
      <Grid container sx={{ height: '100%' }}>
        <Grid item xs={12} sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
          {/* Problem Statement Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              Problem Statement
            </Typography>
            <Paper sx={{ p: 2, bgcolor: '#f8f9fa' }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="Enter the problem statement..."
                variant="outlined"
              />
            </Paper>
          </Box>

          {/* Code Editor Section */}
          <Box sx={{ height: '50%', mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              Code Editor
            </Typography>
            <Box sx={{
              height: 'calc(100% - 40px)',
              '.monaco-editor': {
                paddingTop: 1
              }
            }}>
              <Editor
                height="100%"
                defaultLanguage="python"
                value={code}
                onChange={handleEditorChange}
                theme="vs"
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'on',
                  scrollBeyond: false,
                  lineHeight: 1.3,
                  padding: { top: 10 }
                }}
              />
            </Box>
          </Box>

          {/* Submit Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              size="large"
              sx={{
                bgcolor: '#1976d2',
                '&:hover': {
                  bgcolor: '#1565c0'
                }
              }}
            >
              Create Interview
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default NewInterviewPage;
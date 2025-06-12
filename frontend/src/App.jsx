import { useState, useEffect } from 'react'
import { Box, Paper, Grid, Typography, TextField, IconButton, Avatar } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SearchIcon from '@mui/icons-material/Search'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import PersonIcon from '@mui/icons-material/Person'
import Editor from '@monaco-editor/react'
import './App.css'

const API_URL = 'https://comphcithree.eecs.umich.edu:8100';

function App() {
  const [code, setCode] = useState('// Write your code here\n')
  const [problemStatement, setProblemStatement] = useState('')
  const [messages, setMessages] = useState([
    { text: "Hey, how can I help?", sender: 'assistant', timestamp: '1m' }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [interviewData, setInterviewData] = useState(null)
  const [error, setError] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize interview session when component mounts
  useEffect(() => {
    const initializeInterview = async () => {
      try {
        const response = await fetch(`${API_URL}/api/interview/beginner`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',  // This is crucial for sending/receiving cookies
          mode: 'cors'  // Explicitly state we're using CORS
        });
        if (!response.ok) {
          throw new Error('Failed to create interview session');
        }
        const data = await response.json();
        setInterviewData(data);
        setProblemStatement(data.problem_statement);
        setCode(data.student_artifact || '// Write your code here\n');
        setIsInitialized(true);
        console.log('Interview session created:', data);
      } catch (err) {
        setError(err.message);
        console.error('Error creating interview:', err);
      }
    };

    initializeInterview();
  }, []); // Empty dependency array means this runs once on mount

  const handleEditorChange = (value) => {
    setCode(value)
  }

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Include interview data in the message if available
      const messageData = {
        text: newMessage,
        sender: 'user',
        timestamp: 'now',
        ...(interviewData && {
          student_type_id: interviewData.student_type_id,
          interview_id: interviewData.interview_id
        })
      };

      setMessages([...messages, messageData])
      setNewMessage('')
      // Here you would typically send the message to your backend
      // and handle the response
    }
  }

  // Show error if interview creation failed
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
        {/* Left Panel */}
        <Grid item xs={12} md={6} sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
          {/* Problem Statement Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              Problem Statement
            </Typography>
            <Paper sx={{ p: 2, bgcolor: '#f8f9fa' }}>
              <Typography variant="body1">
                {problemStatement}
              </Typography>
            </Paper>
          </Box>

          {/* Code Editor Section */}
          <Box sx={{ height: '50%', mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              Code Editor {interviewData && `(Session: ${interviewData.interview_id})`}
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

          {/* Additional Information Section */}
          <Box sx={{
            flex: 1,
            bgcolor: '#f8f9fa',
            borderRadius: 2,
            p: 2,
            overflowY: 'auto'
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              Additional Information
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              This section can contain:
            </Typography>
            <ul style={{ marginLeft: '20px', marginTop: '8px', color: 'text.secondary' }}>
              <li>Problem description</li>
              <li>Test cases</li>
              <li>Expected output</li>
              <li>Hints or constraints</li>
            </ul>
          </Box>
        </Grid>

        {/* Conversation Panel */}
        <Grid item xs={12} md={6} sx={{ height: '100%', p: 2 }}>
          <Paper sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Chat Header */}
            <Box sx={{
              p: 2,
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{
                  width: 40,
                  height: 40,
                  bgcolor: '#1976d2'
                }}>
                  <AccountCircleIcon />
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  Interviewer
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton size="small">
                  <SearchIcon />
                </IconButton>
                <IconButton size="small">
                  <MoreVertIcon />
                </IconButton>
              </Box>
            </Box>

            {/* Messages Area */}
            <Box sx={{
              flexGrow: 1,
              overflowY: 'auto',
              p: 2,
              bgcolor: '#fff',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '4px',
              },
            }}>
              {messages.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    mb: 2,
                    gap: 1
                  }}
                >
                  <Avatar sx={{
                    width: 24,
                    height: 24,
                    bgcolor: message.sender === 'user' ? '#9c27b0' : '#1976d2'
                  }}>
                    {message.sender === 'user' ? <PersonIcon /> : <AccountCircleIcon />}
                  </Avatar>
                  <Box
                    sx={{
                      maxWidth: '70%',
                      p: 1.2,
                      borderRadius: 1,
                      bgcolor: message.sender === 'user' ? '#9c27b0' : '#f5f5f5',
                      color: message.sender === 'user' ? 'white' : 'text.primary',
                      position: 'relative',
                    }}
                  >
                    <Typography variant="body2">{message.text}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        bottom: -20,
                        right: message.sender === 'user' ? 0 : 'auto',
                        left: message.sender === 'assistant' ? 0 : 'auto',
                        color: 'text.secondary'
                      }}
                    >
                      {message.timestamp}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Input Area */}
            <Box sx={{
              p: 2,
              borderTop: '1px solid #e0e0e0',
              bgcolor: '#fff'
            }}>
              <Box sx={{
                display: 'flex',
                gap: 1,
                bgcolor: '#f5f5f5',
                borderRadius: 2,
                p: 1
              }}>
                <TextField
                  fullWidth
                  variant="standard"
                  placeholder="Say something..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  InputProps={{
                    disableUnderline: true
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      padding: '4px 8px',
                    }
                  }}
                />
                <IconButton size="small">
                  <LocationOnIcon />
                </IconButton>
                <IconButton size="small">
                  <AttachFileIcon />
                </IconButton>
                <IconButton size="small">
                  <InsertEmoticonIcon />
                </IconButton>
                <IconButton
                  color="primary"
                  onClick={handleSendMessage}
                  sx={{
                    bgcolor: '#9c27b0',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#7b1fa2'
                    }
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default App

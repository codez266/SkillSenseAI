import { useState, useEffect } from 'react'
import { Box, Paper, Grid, Typography, TextField, IconButton, Avatar, Chip, Button } from '@mui/material'
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom'
import SendIcon from '@mui/icons-material/Send'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SearchIcon from '@mui/icons-material/Search'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import PersonIcon from '@mui/icons-material/Person'
import Editor from '@monaco-editor/react'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { logger } from './logger'
import './App.css'
import NewInterviewPage from './pages/NewInterviewPage'

// const API_URL = 'http://127.0.0.1:9003';
const API_URL = import.meta.env.VITE_FLASK_APP_URL;

function InterviewPage() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('// Write your code here\n')
  const [problemStatement, setProblemStatement] = useState('')
  const [messages, setMessages] = useState([
    { text: "Hey, how can I help?", sender: 'assistant', timestamp: '1m' }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [interviewData, setInterviewData] = useState(null)
  const [error, setError] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])
  const [suggestedReplies, setSuggestedReplies] = useState([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [isFetchingInterviewerResponse, setIsFetchingInterviewerResponse] = useState(false)
  const [isSelectingSuggestion, setIsSelectingSuggestion] = useState(false)

  // Parse conversation history from existing interview
  const parseExistingConversation = (conversationHistory) => {
    const parsedHistory = [];
    const chatMessages = [];

    conversationHistory.forEach((conv, index) => {
      // Add interviewer question to chat
      if (conv.conversation_turn_id === 0 && conv.conversation_responded === 1) {
        chatMessages.push({
          text: conv.conversation_response,
          sender: 'assistant',
          timestamp: conv.conversation_timestamp,
          bloom_level: conv.conversation_metadata.bloom_level,
          turn_id: conv.conversation_turn_id
        });

        // Add interviewer metadata
        const metadata = conv.conversation_metadata;
        parsedHistory.push({
          type: 'interviewer',
          concepts: conv.conversation_k_cs.concepts.map(concept => ({
            name: concept.concept,
            score: concept.score
          })),
          rationale: metadata.question_rationale,
          bloom_level: metadata.bloom_level,
          turn_id: conv.conversation_turn_id
        });
      } else if (conv.conversation_turn_id === 1) {
        // Add student response to chat
        chatMessages.push({
          text: conv.conversation_response,
          sender: 'user',
          timestamp: conv.conversation_timestamp,
          turn_id: conv.conversation_turn_id
        });

        // Add student metadata
        parsedHistory.push({
          type: 'student',
          processed_answer: conv.conversation_response,
          reference_answer: conv.conversation_reference,
          turn_id: conv.conversation_turn_id
        });
      }
    });

    return { parsedHistory, chatMessages };
  };

  // Initialize interview session when component mounts
  useEffect(() => {
    const initializeInterview = async () => {
      try {
        // Determine which endpoint to call
        const endpoint = interviewId
          ? `${API_URL}/api/interview/record/${interviewId}`
          : `${API_URL}/api/interview/beginner`;

        logger.info('Fetching interview data from endpoint:', endpoint);

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          mode: 'cors'
        });

        if (!response.ok) {
          throw new Error(interviewId ? 'Interview not found' : 'Failed to create interview session');
        }

        const data = await response.json();

        // Set interview data
        setInterviewData({
          interview_id: data.interview_id,
          student_type_id: data.interview_student_id
        });

        // Set problem statement and code
        const artifact = data.interview_artifact;
        setProblemStatement(artifact.problem_statement);
        setCode(artifact.problem_solution);

        // Parse and set conversation history
        const { parsedHistory, chatMessages } = parseExistingConversation(data.interview_conversation_history);
        setConversationHistory(parsedHistory);
        setMessages(chatMessages);

        // If this is a new interview, navigate to its URL
        if (!interviewId) {
          navigate(`/interview/${data.interview_id}`);
        }

        setIsInitialized(true);
      } catch (err) {
        setError(err.message);
        console.error('Error initializing interview:', err);
      }
    };

    initializeInterview();
  }, [interviewId, navigate]);

  const handleEditorChange = (value) => {
    setCode(value)
  }

  const handleSendMessage = async () => {
    // if (newMessage.trim()) {
    //   return;
    // }
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

    if (newMessage.trim()) {
      setMessages([...messages, messageData])
    }
    setNewMessage('')

    try {
      setIsFetchingInterviewerResponse(true);
      setIsSelectingSuggestion(true);
      // Then get interviewer's response
      const interviewerResponse = await fetch(`${API_URL}/api/conversation/interviewer/${interviewData.interview_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!interviewerResponse.ok) {
        throw new Error('Failed to get interviewer response');
      }

      const interviewerData = await interviewerResponse.json();

      // Add suggested replies to chat
      const newMessages = [...messages];
      interviewerData.suggested_conversations.forEach((suggestion, index) => {
        newMessages.push({
          text: suggestion.conversation_response,
          sender: 'assistant',
          timestamp: 'now',
          isSuggestion: true,
          suggestionIndex: index,
          turn_id: suggestion.conversation_turn_id,
          bloom_level: suggestion.conversation_metadata.bloom_level
        });
      });
      setMessages(newMessages);
      setSuggestedReplies(interviewerData.suggested_conversations);

    } catch (err) {
      console.error('Error in conversation:', err);
      setError(err.message);
    } finally {
      setIsFetchingInterviewerResponse(false);
    }
  }

  const handleSelectSuggestion = async (suggestionIndex) => {
    const selectedSuggestion = suggestedReplies[suggestionIndex];

    try {
      // setIsSelectingSuggestion(true);
      // Mark the selected suggestion as responded to
      const markResponse = await fetch(`${API_URL}/api/conversation/interviewer/select_suggested_conversation/${interviewData.interview_id}/${suggestionIndex}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!markResponse.ok) {
        throw new Error('Failed to mark suggestion as responded');
      }

      // Remove all suggestions from messages
      const filteredMessages = messages.filter(msg => !msg.isSuggestion);

      // Add the selected suggestion as a regular message
      setMessages([...filteredMessages, {
        text: selectedSuggestion.conversation_response,
        sender: 'assistant',
        timestamp: 'now',
        bloom_level: selectedSuggestion.conversation_metadata.bloom_level,
        turn_id: selectedSuggestion.conversation_turn_id
      }]);

      // Add interviewer metadata to conversation history
      setConversationHistory(prev => [...prev, {
        type: 'interviewer',
        concepts: selectedSuggestion.conversation_k_cs.concepts.map(concept => ({
          name: concept.concept,
          score: concept.score
        })),
        rationale: selectedSuggestion.conversation_metadata.question_rationale,
        bloom_level: selectedSuggestion.conversation_metadata.bloom_level,
        turn_id: selectedSuggestion.conversation_turn_id
      }]);

      // Clear suggestions
      setSuggestedReplies([]);
    } catch (err) {
      console.error('Error marking suggestion as responded:', err);
      setError(err.message);
    } finally {
      setIsSelectingSuggestion(false);
    }
  }

  const handleSimulate = async () => {
    if (isSimulating) return;

    setIsSimulating(true);
    try {
      // Get simulated student response
      const studentResponse = await fetch(`${API_URL}/api/conversation/student/${interviewData.interview_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!studentResponse.ok) {
        throw new Error('Failed to get simulated student response');
      }

      const studentData = await studentResponse.json();

      // Add student response to chat
      setMessages(prevMessages => [...prevMessages, {
        text: studentData.processed_answer,
        sender: 'user',
        timestamp: 'now',
        turn_id: 1
      }]);

      // Add student response metadata to conversation history
      setConversationHistory(prev => [...prev, {
        type: 'student',
        processed_answer: studentData.processed_answer,
        reference_answer: studentData.reference_answer,
        turn_id: 1
      }]);

    } catch (err) {
      console.error('Error in simulation:', err);
      setError(err.message);
    } finally {
      setIsSimulating(false);
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
              <Typography
                variant="body1"
                component="div"
                dangerouslySetInnerHTML={{ __html: problemStatement }}
                sx={{
                  '& p': { mb: 1 },
                  '& ul, & ol': { pl: 2, mb: 1 },
                  '& li': { mb: 0.5 },
                  '& code': {
                    bgcolor: '#e0e0e0',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    fontFamily: 'monospace'
                  }
                }}
              />
            </Paper>
          </Box>

          {/* Code Editor Section */}
          <Box sx={{ height: '40%', mb: 3 }}>
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
                      cursor: message.isSuggestion ? 'pointer' : 'default',
                      ...(message.isSuggestion && {
                        bgcolor: '#ffffff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: '1px solid #e0e0e0',
                        transform: 'translateY(0)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          borderColor: '#9c27b0',
                          bgcolor: '#fafafa'
                        }
                      })
                    }}
                    onClick={() => message.isSuggestion && handleSelectSuggestion(message.suggestionIndex)}
                  >
                    <Typography variant="body2">{message.text}</Typography>
                    {message.bloom_level && (
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        mt: 1
                      }}>
                        <Chip
                          label={message.bloom_level}
                          size="small"
                          sx={{
                            height: '20px',
                            fontSize: '0.7rem',
                            bgcolor: message.bloom_level === 'Analyze' ? '#e8f5e9' : '#fff3e0',
                            color: message.bloom_level === 'Analyze' ? '#2e7d32' : '#ef6c00',
                            '&:hover': {
                              bgcolor: message.bloom_level === 'Analyze' ? '#c8e6c9' : '#ffe0b2'
                            }
                          }}
                        />
                      </Box>
                    )}
                    {message.isSuggestion && (
                      <Box sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        bgcolor: '#9c27b0',
                        color: 'white',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        {message.suggestionIndex + 1}
                      </Box>
                    )}
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
                flexDirection: 'column',
                gap: 1
              }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={suggestedReplies.length > 0 ? handleSelectSuggestion : (messages.length % 2 === 0 ? handleSendMessage : handleSimulate)}
                    startIcon={<PlayArrowIcon />}
                    disabled={isSimulating || isFetchingInterviewerResponse || isSelectingSuggestion}
                    sx={{
                      bgcolor: (isSimulating || isFetchingInterviewerResponse || isSelectingSuggestion) ? '#bdbdbd' : '#9c27b0',
                      '&:hover': {
                        bgcolor: (isSimulating || isFetchingInterviewerResponse || isSelectingSuggestion) ? '#bdbdbd' : '#7b1fa2'
                      },
                      '&.Mui-disabled': {
                        bgcolor: '#bdbdbd',
                        color: 'white'
                      }
                    }}
                  >
                    {isSimulating ? 'Simulating...' :
                     isFetchingInterviewerResponse ? 'Getting Response...' :
                     isSelectingSuggestion ? 'Select a suggestion...' :
                     (messages.length > 0 && messages[messages.length - 1].turn_id === 1) || (messages.length==0) ? 'Get Next Question' :
                     'Simulate Response'}
                  </Button>
                </Box>
                <Box sx={{
                  display: 'flex',
                  gap: 1,
                  bgcolor: '#f5f5f5',
                  borderRadius: 2,
                  p: 1,
                  opacity: 0.5,
                  pointerEvents: 'none'
                }}>
                  <TextField
                    fullWidth
                    variant="standard"
                    placeholder="Chat disabled - Use the button above"
                    value=""
                    InputProps={{
                      disableUnderline: true
                    }}
                    sx={{
                      '& .MuiInputBase-root': {
                        padding: '4px 8px',
                      }
                    }}
                  />
                  <IconButton
                    color="primary"
                    disabled
                    sx={{
                      bgcolor: '#9c27b0',
                      color: 'white',
                      opacity: 0.5
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    const createNewInterview = async () => {
      try {
        logger.info('Fetching interview data from home page...');
        const response = await fetch(`${API_URL}/api/interview/beginner`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          mode: 'cors'
        });

        if (!response.ok) {
          throw new Error('Failed to create interview session');
        }

        const data = await response.json();
        logger.info('Interview data fetched, id:', data.interview_id);
        navigate(`/interview/${data.interview_id}`);
      } catch (err) {
        console.error('Error creating interview:', err);
      }
    };

    createNewInterview();
  }, [navigate]);

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}>
      <Typography variant="h6">Creating new interview...</Typography>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/interview/new" element={<NewInterviewPage />} />
        <Route path="/interview/:interviewId" element={<InterviewPage />} />
      </Routes>
    </Router>
  );
}

export default App

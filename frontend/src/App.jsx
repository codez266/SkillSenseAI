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
import ConversationAnalysis from './components/ConversationAnalysis'
import ChatMessages from './components/ChatMessages'
import DraftMessages from './components/DraftMessages'
// Global configuration
const SHOW_CONVERSATION_ANALYSIS = false; // Set to false to hide the analysis section

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
          turn_id: conv.conversation_turn_id,
          turn_number: conv.conversation_turn_number,
          reference_concepts: conv.conversation_reference_kcs.concepts,
          selected_concepts: conv.conversation_metadata.labeled_concepts || []
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
      if (messages.length > 0 && messages[messages.length - 1].turn_id === 1) {
        const lastTurnNumber = messages[messages.length - 1].turn_number;
        const selectedConcepts = messages[messages.length - 1].selected_concepts || [];

        if (selectedConcepts.length > 0) {
          const params = new URLSearchParams();
          selectedConcepts.forEach(concept => params.append('concepts', concept));
          logger.info('Selected concepts: ' + selectedConcepts);

          const selectConceptResponse = await fetch(`${API_URL}/api/conversation/student/select_reference_concepts/${interviewData.interview_id}/${lastTurnNumber}?${params.toString()}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          if (!selectConceptResponse.ok) {
            throw new Error('Failed to select reference concepts for turn number: ' + lastTurnNumber);
          }
        }
      }

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
        text: studentData.conversation_response,
        sender: 'user',
        timestamp: 'now',
        turn_id: 1,
        turn_number: studentData.conversation_turn_number,
        reference_concepts: studentData.conversation_reference_kcs.concepts,
        selected_concepts: studentData.conversation_metadata.labeled_concepts || []
      }]);

      // Add student response metadata to conversation history
      setConversationHistory(prev => [...prev, {
        type: 'student',
        processed_answer: studentData.conversation_response,
        reference_answer: studentData.conversation_reference,
        turn_id: 1
      }]);

    } catch (err) {
      console.error('Error in simulation:', err);
      setError(err.message);
    } finally {
      setIsSimulating(false);
    }
  }

  const handleConceptSelect = (messageIdx, conceptIdx) => {
    setMessages(prevMessages => {
      return prevMessages.map((msg, idx) => {
        if (idx !== messageIdx) return msg;
        const concept = msg.reference_concepts[conceptIdx];
        const selected_concepts = msg.selected_concepts || [];
        let newSelected;
        if (selected_concepts.includes(concept)) {
          newSelected = selected_concepts.filter(c => c !== concept);
        } else {
          newSelected = [...selected_concepts, concept];
        }
        return {
          ...msg,
          selected_concepts: newSelected
        };
      });
    });
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
          <Box sx={{ mb: 3 }} height="30%">
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              Problem Statement
            </Typography>
            <Paper sx={{ p: 2, bgcolor: '#f8f9fa' }}>
              <Typography
                variant="body2"
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
          <Box sx={{ height: '75%', mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#1976d2' }}>
              Student solution {interviewData && `(Session: ${interviewData.interview_id})`}
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
          {SHOW_CONVERSATION_ANALYSIS && (
            <ConversationAnalysis conversationHistory={conversationHistory} />
          )}
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
                  bgcolor: '#9c27b0'
                }}>
                  <PersonIcon />
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  Student
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
              <ChatMessages
                messages={messages}
                onSelectSuggestion={handleSelectSuggestion}
                onConceptSelect={handleConceptSelect}
              />
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
                     (messages.length > 0 && messages[messages.length - 1].turn_id === 1) || (messages.length==0) ? 'Get Next Questions' :
                     'Simulate Response'}
                  </Button>
                </Box>
                <Box sx={{
                  display: 'flex',
                  gap: 1,
                  bgcolor: '#f5f5f5',
                  borderRadius: 2,
                  p: 1,
                  opacity: 0.8,
                  // pointerEvents: 'none'
                }}>
                  {suggestedReplies.length > 0 ? (
                    <DraftMessages
                      messages={suggestedReplies}
                      onSelectSuggestion={handleSelectSuggestion}
                    />
                  ) : (
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
                  )}
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

// Shared function for creating interviews
const createInterview = async (level = 'beginner', policy = 0, artifact_id = null, navigate) => {
  try {
    logger.info(`Creating ${level} level interview...`);
    let api_url;
    if (artifact_id != null) {
      api_url = `${API_URL}/api/interview/${level}/${policy}/${artifact_id}`;
    } else {
      api_url = `${API_URL}/api/interview/${level}/${policy}`;
    }
    const response = await fetch(api_url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`Failed to create ${level} level interview session`);
    }

    const data = await response.json();
    logger.info(`${level} level interview created with policy ${policy}, id:`, data.interview_id);
    navigate(`/interview/${data.interview_id}`);
  } catch (err) {
    console.error(`Error creating ${level} level interview with policy ${policy}:`, err);
    // Navigate to home page on error
    navigate('/');
  }
};

function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    createInterview('beginner', 0, null, navigate);
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

function LevelInterviewPage() {
  const { level, policy, artifact_id } = useParams();
  const navigate = useNavigate();

  const actualPolicy = policy ? parseInt(policy) : 0;

  useEffect(() => {
    createInterview(level, actualPolicy, artifact_id, navigate);
  }, [level, actualPolicy, artifact_id, navigate]);

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}>
      <Typography variant="h6">Creating {level} level interview with policy {actualPolicy}...</Typography>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:level" element={<LevelInterviewPage />} />
        <Route path="/:level/:policy" element={<LevelInterviewPage />} />
        <Route path="/:level/:policy/:artifact_id" element={<LevelInterviewPage />} />
        <Route path="/interview/new" element={<NewInterviewPage />} />
        <Route path="/interview/:interviewId" element={<InterviewPage />} />
      </Routes>
    </Router>
  );
}

export default App

import { Box, Avatar, Typography, Chip } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PersonIcon from '@mui/icons-material/Person';

function ChatMessages({ messages, onSelectSuggestion, onConceptSelect }) {
  // Filter messages to only show student responses (conversation_turn_id === 1) and exclude suggestions
  const studentMessages = messages.filter(message =>
    !message.isSuggestion
  );

  return (
    <>
      {studentMessages.map((message, index) => (
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
            onClick={() => message.isSuggestion && onSelectSuggestion(message.suggestionIndex)}
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
                    bgcolor:
                      message.bloom_level === 'analyze' ? '#e8f5e9' :
                      message.bloom_level === 'evaluate' ? '#e3f2fd' :
                      message.bloom_level === 'create' ? '#f3e5f5' :
                      message.bloom_level === 'apply' ? '#fff3e0' : '#eeeeee',
                    color:
                      message.bloom_level === 'analyze' ? '#2e7d32' :
                      message.bloom_level === 'evaluate' ? '#1976d2' :
                      message.bloom_level === 'create' ? '#8e24aa' :
                      message.bloom_level === 'apply' ? '#ef6c00' : '#333',
                    '&:hover': {
                      bgcolor:
                        message.bloom_level === 'analyze' ? '#c8e6c9' :
                        message.bloom_level === 'evaluate' ? '#bbdefb' :
                        message.bloom_level === 'create' ? '#ce93d8' :
                        message.bloom_level === 'apply' ? '#ffe0b2' : '#e0e0e0'
                    }
                  }}
                />
              </Box>
            )}
            {message.reference_concepts && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {message.reference_concepts.map((concept, idx) => {
                  const isActiveMessage = messages.indexOf(message) === messages.length - 1;
                  // const isActiveMessage = true;
                  const isSelected = message.selected_concepts.includes(concept);
                  return (
                    <Chip
                      key={idx}
                      label={concept.replaceAll('_', ' ')}
                      size="small"
                      onClick={isActiveMessage ? () => onConceptSelect(index, idx) : undefined}
                      sx={{
                        bgcolor: !isActiveMessage ? 'lightgrey' : isSelected ? 'rgb(167, 201, 247)' : 'white',
                        border: isActiveMessage ? '1px solid rgb(167, 201, 247)' : '',
                        '&:hover': isActiveMessage ? {
                          bgcolor: 'rgb(167, 201, 247)',
                          cursor: 'pointer'
                        } : {}
                      }}
                    />
                  );
                })}
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
    </>
  );
}

export default ChatMessages;
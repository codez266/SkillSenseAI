import { Box, Avatar, Typography, Chip } from '@mui/material';

function DraftMessages({ messages, onSelectSuggestion }) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
        {messages.map((message, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-start',
              mb: 0,
              gap: 1,
              width: '100%'
            }}
          >
            <Box
              sx={{
                width: '97%',
                maxWidth: '97%',
                p: 1.2,
                borderRadius: 1,
                bgcolor: '#ffffff',
                color: 'text.primary',
                position: 'relative',
                cursor: 'pointer',
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
              }}
              onClick={() => onSelectSuggestion(index)}
            >
              <Typography variant="body2">{message.conversation_response}</Typography>
              {message.conversation_metadata.bloom_level && (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  mt: 1
                }}>
                  <Chip
                    label={message.conversation_metadata.bloom_level}
                    size="small"
                    sx={{
                      height: '20px',
                      fontSize: '0.7rem',
                      bgcolor: message.conversation_metadata.bloom_level === 'Analyze' ? '#e8f5e9' : '#fff3e0',
                      color: message.conversation_metadata.bloom_level === 'Analyze' ? '#2e7d32' : '#ef6c00',
                      '&:hover': {
                        bgcolor: message.conversation_metadata.bloom_level === 'Analyze' ? '#c8e6c9' : '#ffe0b2'
                      }
                    }}
                  />
                </Box>
              )}

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
                  {index + 1}
                </Box>
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  export default DraftMessages;
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
              {(() => {
                const bloomLevel = message.conversation_metadata.bloom_level;
                const bloomLevelLower = bloomLevel ? bloomLevel.toLowerCase() : '';
                return bloomLevel && (
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: 1
                  }}>
                    <Chip
                      label={bloomLevel}
                      size="small"
                      sx={{
                        height: '20px',
                        fontSize: '0.7rem',
                        bgcolor:
                          bloomLevelLower === 'analyze' ? '#e8f5e9' :
                          bloomLevelLower === 'evaluate' ? '#e3f2fd' :
                          bloomLevelLower === 'create' ? '#f3e5f5' :
                          bloomLevelLower === 'apply' ? '#fff3e0' : '#eeeeee',
                        color:
                          bloomLevelLower === 'analyze' ? '#2e7d32' :
                          bloomLevelLower === 'evaluate' ? '#1976d2' :
                          bloomLevelLower === 'create' ? '#8e24aa' :
                          bloomLevelLower === 'apply' ? '#ef6c00' : '#333',
                        '&:hover': {
                          bgcolor:
                            bloomLevelLower === 'analyze' ? '#c8e6c9' :
                            bloomLevelLower === 'evaluate' ? '#bbdefb' :
                            bloomLevelLower === 'create' ? '#ce93d8' :
                            bloomLevelLower === 'apply' ? '#ffe0b2' : '#e0e0e0'
                        }
                      }}
                    />
                  </Box>
                );
              })()}

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
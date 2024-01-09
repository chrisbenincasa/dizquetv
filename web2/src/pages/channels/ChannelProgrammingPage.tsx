import { Box, Button, Paper, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { TvGuideProgram } from 'dizquetv-types';
import { Link } from 'react-router-dom';
import { ChannelProgrammingConfig } from '../../components/channel_config/ChannelProgrammingConfig.tsx';
import { apiClient } from '../../external/api.ts';
import { usePreloadedData } from '../../hooks/preloadedDataHook.ts';
import useStore from '../../store/index.ts';
import { editProgrammingLoader } from './loaders.ts';

export default function ChannelProgrammingPage() {
  const { channel } = usePreloadedData(editProgrammingLoader);
  const newLineup = useStore((s) => s.channelEditor.programList);

  // TODO we need to update the channel start time too
  const updateLineupMutation = useMutation({
    mutationKey: ['channels', channel.number, 'lineup'],
    mutationFn: (newLineup: TvGuideProgram[]) => {
      return apiClient.post('/api/v2/channels/:number/lineup', newLineup, {
        params: { number: channel.number },
      });
    },
    onSuccess: (data) => {
      data;
    },
  });

  const onSave = () => {
    updateLineupMutation
      .mutateAsync(newLineup)
      .then(console.log)
      .catch(console.error);
  };

  return (
    <div>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Channel {channel.number} Programming
      </Typography>
      <Paper sx={{ p: 2 }}>
        <ChannelProgrammingConfig />
      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'end', pt: 1, columnGap: 1 }}>
        <Button variant="contained" to="/channels" component={Link}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => onSave()}>
          Save
        </Button>
      </Box>
    </div>
  );
}

import { Channel, TvGuideProgram } from 'dizquetv-types';
import { StateCreator } from 'zustand';

// Represents a program listing in the editor
export interface ChannelEditorStateInner {
  currentChannel?: Channel;
  programList: TvGuideProgram[];
  dirty: {
    programs: boolean;
  };
}

export interface ChannelEditorState {
  channelEditor: ChannelEditorStateInner;
}

export const initialChannelEditorState: ChannelEditorState = {
  channelEditor: {
    programList: [],
    dirty: {
      programs: false,
    },
  },
};

export const createChannelEditorState: StateCreator<
  ChannelEditorState
> = () => {
  return initialChannelEditorState;
};

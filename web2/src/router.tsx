import { createBrowserRouter } from 'react-router-dom';
import App, { Root } from './App.tsx';
import ChannelProgrammingPage from './pages/channels/ChannelProgrammingPage.tsx';
import ChannelsPage from './pages/channels/ChannelsPage.tsx';
import EditChannelPage from './pages/channels/EditChannelPage.tsx';
import {
  editChannelLoader,
  editProgrammingLoader,
} from './pages/channels/loaders.ts';
import CustomShowsPage from './pages/custom-shows/CustomShowsPage.tsx';
import FillerListsPage from './pages/filler/FillerListsPage.tsx';
import GuidePage from './pages/guide/GuidePage.tsx';
import FfmpegSettingsPage from './pages/settings/FfmpegSettingsPage.tsx';
import PlexSettingsPage from './pages/settings/PlexSettingsPage.tsx';
import SettingsLayout from './pages/settings/SettingsLayout.tsx';
import XmlTvSettingsPage from './pages/settings/XmlTvSettingsPage.tsx';
import { queryCache } from './queryClient.ts';
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({ queryCache });

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        element: <App />,
        index: true,
      },
      {
        path: '/channels',
        element: <ChannelsPage />,
      },
      {
        path: '/channels/:id/edit',
        element: <EditChannelPage />,
        loader: editChannelLoader(queryClient),
      },
      {
        path: '/channels/:id/programming',
        element: <ChannelProgrammingPage />,
        loader: editProgrammingLoader(queryClient),
      },
      {
        path: '/guide',
        element: <GuidePage />,
      },
      {
        path: '/settings',
        element: <SettingsLayout />,
        children: [
          {
            path: '/settings/xmltv',
            element: <XmlTvSettingsPage />,
          },
          {
            path: '/settings/ffmpeg',
            element: <FfmpegSettingsPage />,
          },
          {
            path: '/settings/plex',
            element: <PlexSettingsPage />,
          },
        ],
      },
      {
        path: '/library',
        children: [
          {
            path: '/library/filler',
            element: <FillerListsPage />,
          },
          {
            path: '/library/custom-shows',
            element: <CustomShowsPage />,
          },
        ],
      },
    ],
  },
]);

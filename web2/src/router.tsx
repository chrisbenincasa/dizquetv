import { createBrowserRouter } from 'react-router-dom';
import App, { Root } from './App.tsx';
import ChannelsPage from './pages/channels/ChannelsPage.tsx';
import SettingsLayout from './pages/settings/SettingsLayout.tsx';
import XmlTvSettingsPage from './pages/settings/XmlTvSettingsPage.tsx';
import GuidePage from './pages/guide/GuidePage.tsx';
import FfmpegSettingsPage from './pages/settings/FfmpegSettingsPage.tsx';
import PlexSettingsPage from './pages/settings/PlexSettingsPage.tsx';

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
        path: '/guide',
        element: <GuidePage />,
      },
      {
        path: '/settings',
        element: <SettingsLayout />,
        children: [
          // {
          //   element: <XmlTvSettingsPage />,
          //   index: true,
          // },
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
    ],
  },
]);
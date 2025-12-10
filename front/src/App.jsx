import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AiAssistantProvider } from './contexts/AiAssistantContext';
import MainLayout from './components/layout/MainLayout';
import '@styles/index.css';

const Welcome = lazy(() => import('./pages/Welcome'));
const Home = lazy(() => import('./pages/Home'));
const SelfSpace = lazy(() => import('./pages/SelfSpace'));
const BlogEditor = lazy(() => import('./pages/BlogEditor'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const MessageList = lazy(() => import('./pages/MessageList'));
const ConversationDetail = lazy(() => import('./pages/ConversationDetail'));
const UserSearch = lazy(() => import('./pages/UserSearch'));
const PendingFriendRequests = lazy(() => import('./pages/PendingFriendRequests'));
const FriendsList = lazy(() => import('./pages/FriendsList'));
const FollowingList = lazy(() => import('./pages/FollowingList'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const Loading = lazy(() => import('./pages/Loading'));
const OAuth2Callback = lazy(() => import('./pages/OAuth2Callback'));

export default function App() {
	return (
		<BrowserRouter>
			<AiAssistantProvider>
				<Suspense fallback={null}>
					<MainLayout>
						<Routes>
							<Route path="/_loading" element={<Loading />} />
							<Route path="/" element={<WithLoading><Home /></WithLoading>} />
							<Route path="/home" element={<WithLoading><Home /></WithLoading>} />
							<Route path="/welcome" element={<WithLoading><Welcome /></WithLoading>} />
							<Route path="/selfspace" element={<WithLoading><SelfSpace /></WithLoading>} />
							<Route path="/blog-edit" element={<WithLoading><BlogEditor /></WithLoading>} />
							<Route path="/post/:id" element={<WithLoading><ArticleDetail /></WithLoading>} />
							<Route path="/messages" element={<WithLoading><MessageList /></WithLoading>} />
							<Route path="/conversation/:otherId" element={<WithLoading><ConversationDetail /></WithLoading>} />
							<Route path="/friends/pending" element={<WithLoading><PendingFriendRequests /></WithLoading>} />
							<Route path="/friends" element={<WithLoading><FriendsList /></WithLoading>} />
							<Route path="/follows" element={<WithLoading><FollowingList /></WithLoading>} />
							<Route path="/notifications" element={<WithLoading><NotificationCenter /></WithLoading>} />
							<Route path="/users/search" element={<WithLoading><UserSearch /></WithLoading>} />
							<Route path="/auth/qq/callback" element={<OAuth2Callback />} />
							<Route path="/auth/wechat/callback" element={<OAuth2Callback />} />
						</Routes>
					</MainLayout>
				</Suspense>
			</AiAssistantProvider>
		</BrowserRouter>
	);
}

function WithLoading({ children }) {
  const location = useLocation();
  const bypass = location.state?.bypassLoading;
	if (!bypass) {
		const to = location.pathname + (location.search || '');
		return <Navigate to="/_loading" replace state={{ to }} />;
	}
  return children;
}

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AiAssistantProvider } from './contexts/AiAssistantContext';
import MainLayout from './components/layout/MainLayout';
import '@styles/index.css';

const Welcome = lazy(() => import('./pages/Welcome'));
const Home = lazy(() => import('./pages/Home'));
const SelfSpace = lazy(() => import('./pages/SelfSpace'));
const BlogEditor = lazy(() => import('./pages/BlogEditor'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const CommunicationPage = lazy(() => import('./pages/CommunicationPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const UserSearch = lazy(() => import('./pages/UserSearch'));
const PendingFriendRequests = lazy(() => import('./pages/PendingFriendRequests'));
const FriendsList = lazy(() => import('./pages/FriendsList'));
const FollowingList = lazy(() => import('./pages/FollowingList'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter'));
const Loading = lazy(() => import('./pages/Loading'));

function AppContent() {
	const [isLoading, setIsLoading] = useState(true);
	const [maidLoaded, setMaidLoaded] = useState(false);
	const [contentPreloaded, setContentPreloaded] = useState(false);

	// 资源加载完成回调
	const handleMaidLoaded = () => setMaidLoaded(true);
	const handleContentPreloaded = () => setContentPreloaded(true);

	// 检查是否可以结束 Loading
	useEffect(() => {
		if (maidLoaded && contentPreloaded) {
			setIsLoading(false);
		}
	}, [maidLoaded, contentPreloaded]);

	// 5秒兜底
	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 5000);
		return () => clearTimeout(timer);
	}, []);

	return (
		<AiAssistantProvider>
			{isLoading && <Loading onReady={handleContentPreloaded} />}
			<MainLayout onMaidLoaded={handleMaidLoaded}>
				<Suspense fallback={null}>
					<Routes>
						<Route path="/" element={<Home />} />
						<Route path="/home" element={<Home />} />
						<Route path="/welcome" element={<Welcome />} />
						<Route path="/selfspace" element={<SelfSpace />} />
						<Route path="/blog-edit" element={<BlogEditor />} />
						<Route path="/post/:id" element={<ArticleDetail />} />
						<Route path="/messages" element={<CommunicationPage />} />
						<Route path="/conversation/:otherId" element={<CommunicationPage />} />
						<Route path="/friends/pending" element={<PendingFriendRequests />} />
						<Route path="/friends" element={<CommunicationPage />} />
						<Route path="/follows" element={<FollowingList />} />
						<Route path="/favorites" element={<FavoritesPage />} />
						<Route path="/search" element={<SearchPage />} />
						<Route path="/notifications" element={<NotificationCenter />} />
						<Route path="/security" element={<SecurityCenter />} />
						<Route path="/users/search" element={<UserSearch />} />
					</Routes>
				</Suspense>
			</MainLayout>
		</AiAssistantProvider>
	);
}

export default function App() {
	return (
		<BrowserRouter>
			<AppContent />
		</BrowserRouter>
	);
}

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, X, Plus, Home, Search, MoreVertical, ExternalLink, Bookmark } from 'lucide-react';

const Browser = ({ onClose, initialUrl = 'https://www.google.com' }: any) => {
    const webviewRef = useRef<any>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tabs, setTabs] = useState([
        { id: 1, title: 'New Tab', url: initialUrl, isActive: true },
    ]);
    const [activeTabId, setActiveTabId] = useState(1);
    const [currentUrl, setCurrentUrl] = useState(initialUrl);
    const [inputUrl, setInputUrl] = useState(initialUrl);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const activeTab = tabs.find((tab: any) => tab.id === activeTabId);

    // Navigation helpers
    const handleNavigate = (url: any) => {
        let finalUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (url.includes('.') && !url.includes(' ')) {
                finalUrl = 'https://' + finalUrl;
            } else {
                finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }
        if (webviewRef.current) {
            webviewRef.current.src = finalUrl;
            setCurrentUrl(finalUrl);
            setInputUrl(finalUrl);
            setTabs(tabs.map((tab: any) => (tab.id === activeTabId ? { ...tab, url: finalUrl } : tab)));
        }
    };

    const handleKeyPress = (e: any) => {
        if (e.key === 'Enter') handleNavigate(inputUrl);
    };

    const goBack = () => { if (webviewRef.current && canGoBack) webviewRef.current.goBack(); };
    const goForward = () => { if (webviewRef.current && canGoForward) webviewRef.current.goForward(); };
    const reload = () => { if (webviewRef.current) webviewRef.current.reload(); };
    const goHome = () => handleNavigate('https://www.google.com');

    // Tab management
    const addNewTab = () => {
        const newId = Math.max(...tabs.map((t: any) => t.id)) + 1;
        const newTab = { id: newId, title: 'New Tab', url: 'https://www.google.com', isActive: false };
        setTabs([...tabs, newTab]);
        switchTab(newId);
    };

    const closeTab = (tabId: any, e: any) => {
        e.stopPropagation();
        if (tabs.length === 1) return;
        const newTabs = tabs.filter((tab: any) => tab.id !== tabId);
        setTabs(newTabs);
        if (tabId === activeTabId) {
            const newActive = newTabs[newTabs.length - 1];
            if (newActive) switchTab(newActive.id);
        }
    };

    const switchTab = (tabId: any) => {
        setActiveTabId(tabId);
        const tab = tabs.find((t: any) => t.id === tabId);
        if (tab) {
            setCurrentUrl(tab.url);
            setInputUrl(tab.url);
            if (webviewRef.current) webviewRef.current.src = tab.url;
        }
    };

    // Drag-to-Resource-Hub
    const toggleFullscreen = () => {
        if (!isFullscreen) {
            if (window.electronAPI) {
                window.electronAPI.invoke('show-widget');
            }
        } else {
            if (window.electronAPI) {
                window.electronAPI.invoke('hide-widget');
            }
        }
        setIsFullscreen(!isFullscreen);
    };

    const handleResourceDrop = (event: any) => {
        event.preventDefault();
        const items = event.dataTransfer.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'string' && (item.type === 'text/uri-list' || item.type === 'text/plain')) {
                item.getAsString((url: any) => {
                    if (url && window.electronAPI) window.electronAPI.send('download-url', url);
                });
                break;
            }
        }
    };
    const handleResourceDragOver = (e: any) => e.preventDefault();

    useEffect(() => {
        const webview = webviewRef.current;
        if (!webview) return;
        const handleDidNavigate = () => {
            const url = webview.getURL();
            setCurrentUrl(url);
            setInputUrl(url);
            setCanGoBack(webview.canGoBack());
            setCanGoForward(webview.canGoForward());
            const title = webview.getTitle() || 'New Tab';
            setTabs(tabs.map((tab: any) => (tab.id === activeTabId ? { ...tab, title, url } : tab)));
        };
        const handleDidStartLoading = () => setIsLoading(true);
        const handleDidStopLoading = () => setIsLoading(false);
        webview.addEventListener('did-navigate', handleDidNavigate);
        webview.addEventListener('did-navigate-in-page', handleDidNavigate);
        webview.addEventListener('did-start-loading', handleDidStartLoading);
        webview.addEventListener('did-stop-loading', handleDidStopLoading);
        return () => {
            webview.removeEventListener('did-navigate', handleDidNavigate);
            webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
            webview.removeEventListener('did-start-loading', handleDidStartLoading);
            webview.removeEventListener('did-stop-loading', handleDidStopLoading);
        };
    }, [activeTabId, tabs]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-zen-text text-sm">
            <div className="w-full h-full flex flex-col flex-1 animate-slide-up zen-card overflow-hidden rounded-[32px] border border-zen-text/10">

                {/* Safari-like Top Navigation Bar */}
                <div className="flex flex-col shrink-0 border-b border-zen-text/10">
                    {/* Top Row: Window Controls & Tabs */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                        {/* Tab Bar */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 mr-4">
                            {tabs.map((tab: any) => (
                                <button key={tab.id} onClick={() => switchTab(tab.id)}
                                    className={`group flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300 tab-enter border ${tab.id === activeTabId
                                        ? 'bg-zen-surface shadow-sm border-zen-text/10'
                                        : 'bg-transparent border-transparent hover:bg-zen-text/5'
                                        }`}
                                >
                                    <span className={`font-medium max-w-[140px] truncate ${tab.id === activeTabId ? 'text-zen-text' : 'text-zen-text-2 group-hover:text-zen-text'}`}>
                                        {tab.title}
                                    </span>
                                    {tabs.length > 1 && (
                                        <X
                                            className="w-3.5 h-3.5 text-zen-text-2 hover:text-red-500 ml-2 transition-colors active:scale-90"
                                            onClick={(e: any) => closeTab(tab.id, e)}
                                            strokeWidth={2}
                                        />
                                    )}
                                </button>
                            ))}
                            <button onClick={addNewTab} className="p-2 ml-1 rounded-full text-zen-text-2 hover:text-zen-text hover:bg-zen-text/10 transition-all active:scale-90" title="New Tab">
                                <Plus className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Close App Button */}
                        <button onClick={onClose} className="p-2.5 rounded-full bg-zen-text/5 hover:bg-red-500/20 text-zen-text-2 hover:text-red-500 active:scale-95 transition-all">
                            <X className="w-4 h-4" strokeWidth={2} />
                        </button>
                    </div>

                    {/* Bottom Row: Address Bar & Navigation */}
                    <div className="flex items-center gap-3 px-6 pb-4">
                        <div className="flex items-center gap-1.5">
                            <button onClick={goBack} disabled={!canGoBack} className="p-2 rounded-full text-zen-text-2 hover:text-zen-text hover:bg-zen-text/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"><ArrowLeft className="w-4 h-4" strokeWidth={2.5} /></button>
                            <button onClick={goForward} disabled={!canGoForward} className="p-2 rounded-full text-zen-text-2 hover:text-zen-text hover:bg-zen-text/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"><ArrowRight className="w-4 h-4" strokeWidth={2.5} /></button>
                            <button onClick={reload} className={`p-2 rounded-full text-zen-text-2 hover:text-zen-text hover:bg-zen-text/10 transition-all ${isLoading ? 'animate-spin' : ''}`}><RotateCw className="w-4 h-4" strokeWidth={2.5} /></button>
                            <button onClick={goHome} className="p-2 rounded-full text-zen-text-2 hover:text-zen-text hover:bg-zen-text/10 transition-all ml-1"><Home className="w-4 h-4" strokeWidth={2} /></button>
                        </div>

                        {/* Address Bar — fills remaining space */}
                        <div className="flex-1 flex items-center gap-3 bg-zen-bg hover:brightness-110 focus-within:brightness-110 rounded-[14px] px-4 py-2 border border-zen-text/10 shadow-inner transition-colors min-w-0">
                            <Search className="w-4 h-4 text-zen-text-2 shrink-0" strokeWidth={2} />
                            <input
                                type="text"
                                value={inputUrl}
                                onChange={(e: any) => setInputUrl(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Search or enter website name"
                                className="flex-1 bg-transparent text-zen-text placeholder-zen-text-2 focus:outline-none font-medium min-w-0"
                            />
                            {currentUrl && (
                                <button onClick={() => window.open(currentUrl, '_blank')} className="p-1 rounded bg-zen-accent/20 text-zen-accent hover:bg-zen-accent/30 transition-colors shrink-0">
                                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <button className="p-2 rounded-full text-zen-text-2 hover:text-zen-text hover:bg-zen-text/10 transition-all"><Bookmark className="w-4 h-4" strokeWidth={2} /></button>
                            <button className="p-2 rounded-full text-zen-text-2 hover:text-zen-text hover:bg-zen-text/10 transition-all"><MoreVertical className="w-4 h-4" strokeWidth={2.5} /></button>
                        </div>
                    </div>
                </div>

                {/* Resource Drop Zone Feedback */}
                <div
                    onDrop={handleResourceDrop}
                    onDragOver={handleResourceDragOver}
                    className="w-full bg-zen-accent/10 border-b border-zen-accent/20 text-center py-1.5 flex items-center justify-center gap-2"
                >
                    <Plus className="w-3.5 h-3.5 text-zen-accent" strokeWidth={2.5} />
                    <span className="text-xs font-semibold tracking-wide text-zen-accent uppercase">Drag to Resource Hub</span>
                </div>

                {/* Browser Content */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden relative shadow-[0_-5px_15px_rgba(0,0,0,0.1)]">
                    <webview
                        ref={webviewRef}
                        src={currentUrl}
                        className="w-full h-full absolute inset-0 pt-0.5"
                        allowpopups={true as any}
                        webpreferences="contextIsolation=yes, nodeIntegration=no"
                    />
                </div>
            </div>
        </div>
    );
};

export default Browser;

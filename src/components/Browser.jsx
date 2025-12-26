import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, X, Plus, Home, Search, MoreVertical, ExternalLink, Bookmark } from 'lucide-react';

const Browser = ({ onClose }) => {
    const webviewRef = useRef(null);
    const [tabs, setTabs] = useState([
        { id: 1, title: 'New Tab', url: 'https://www.google.com', isActive: true },
    ]);
    const [activeTabId, setActiveTabId] = useState(1);
    const [currentUrl, setCurrentUrl] = useState('https://www.google.com');
    const [inputUrl, setInputUrl] = useState('https://www.google.com');
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const activeTab = tabs.find(tab => tab.id === activeTabId);

    // Navigation helpers
    const handleNavigate = (url) => {
        let finalUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            if (url.includes('.') && !url.includes(' ')) {
                finalUrl = 'https://' + url;
            } else {
                finalUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
            }
        }
        if (webviewRef.current) {
            webviewRef.current.src = finalUrl;
            setCurrentUrl(finalUrl);
            setInputUrl(finalUrl);
            // Update tab URL
            setTabs(tabs.map(tab => (tab.id === activeTabId ? { ...tab, url: finalUrl } : tab)));
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleNavigate(inputUrl);
        }
    };

    const goBack = () => {
        if (webviewRef.current && canGoBack) webviewRef.current.goBack();
    };
    const goForward = () => {
        if (webviewRef.current && canGoForward) webviewRef.current.goForward();
    };
    const reload = () => {
        if (webviewRef.current) webviewRef.current.reload();
    };
    const goHome = () => handleNavigate('https://www.google.com');

    // Tab management
    const addNewTab = () => {
        const newId = Math.max(...tabs.map(t => t.id)) + 1;
        const newTab = { id: newId, title: 'New Tab', url: 'https://www.google.com', isActive: false };
        setTabs([...tabs, newTab]);
        switchTab(newId);
    };

    const closeTab = (tabId, e) => {
        e.stopPropagation();
        if (tabs.length === 1) return; // keep at least one tab
        const newTabs = tabs.filter(tab => tab.id !== tabId);
        setTabs(newTabs);
        if (tabId === activeTabId) {
            const newActive = newTabs[newTabs.length - 1];
            switchTab(newActive.id);
        }
    };

    const switchTab = (tabId) => {
        setActiveTabId(tabId);
        const tab = tabs.find(t => t.id === tabId);
        if (tab) {
            setCurrentUrl(tab.url);
            setInputUrl(tab.url);
            if (webviewRef.current) webviewRef.current.src = tab.url;
        }
    };

    // Drag‑to‑Resource‑Hub drop zone (top menu)
    const handleResourceDrop = (event) => {
        event.preventDefault();
        const { ipcRenderer } = window.require ? window.require('electron') : {};
        const items = event.dataTransfer.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'string' && (item.type === 'text/uri-list' || item.type === 'text/plain')) {
                item.getAsString((url) => {
                    if (url && ipcRenderer && ipcRenderer.send) {
                        ipcRenderer.send('download-url', url);
                    }
                });
                break;
            }
        }
    };
    const handleResourceDragOver = (e) => e.preventDefault();

    // Webview event listeners
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
            setTabs(tabs.map(tab => (tab.id === activeTabId ? { ...tab, title, url } : tab)));
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
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
            <style>{`@keyframes tabEnter { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } } .tab-enter { animation: tabEnter 0.3s cubic-bezier(0.2,0.8,0.2,1) forwards; }`}</style>

            {/* Tab Bar */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-2 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => switchTab(tab.id)}
                        className={`group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 tab-enter ${tab.id === activeTabId ? 'bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg scale-105' : 'bg-white/5 border border-white/10 hover:bg-white/8 hover:scale-105'}`}
                    >
                        <span className="text-sm text-white/90 max-w-[150px] truncate">{tab.title}</span>
                        {tabs.length > 1 && (
                            <X className="w-4 h-4 text-white/50 hover:text-white/90 transition-colors" onClick={(e) => closeTab(tab.id, e)} />
                        )}
                    </button>
                ))}
                <button onClick={addNewTab} className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all" title="New Tab">
                    <Plus className="w-4 h-4 text-white/70" />
                </button>
            </div>

            {/* Resource Hub Drop Zone (top menu) */}
            <div onDrop={handleResourceDrop} onDragOver={handleResourceDragOver}
                className="flex items-center justify-center p-2 bg-black/30 border-b border-white/10">
                <span className="text-sm text-white/70">Drag items here to save to Resource Hub</span>
            </div>

            {/* Top Bar */}
            <div className="flex items-center gap-3 px-6 py-3 bg-black/20 backdrop-blur-xl border-b border-white/10">
                <div className="flex items-center gap-1">
                    <button onClick={goBack} disabled={!canGoBack} className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Back"><ArrowLeft className="w-5 h-5 text-white/80" /></button>
                    <button onClick={goForward} disabled={!canGoForward} className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Forward"><ArrowRight className="w-5 h-5 text-white/80" /></button>
                    <button onClick={reload} className={`p-2 rounded-xl hover:bg-white/10 transition-all ${isLoading ? 'animate-spin' : ''}`} title="Reload"><RotateCw className="w-5 h-5 text-white/80" /></button>
                    <button onClick={goHome} className="p-2 rounded-xl hover:bg-white/10 transition-all" title="Home"><Home className="w-5 h-5 text-white/80" /></button>
                </div>
                <div className="flex-1 flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-2.5 border border-white/20 shadow-lg">
                    <Search className="w-4 h-4 text-white/50" />
                    <input type="text" value={inputUrl} onChange={e => setInputUrl(e.target.value)} onKeyPress={handleKeyPress}
                        placeholder="Search or enter URL..." className="flex-1 bg-transparent text-white/90 placeholder-white/40 focus:outline-none text-sm" />
                    {currentUrl && (
                        <button onClick={() => window.open(currentUrl, '_blank')} className="p-1 rounded-lg hover:bg-white/10 transition-all" title="Open in External Browser"><ExternalLink className="w-4 h-4 text-white/50" /></button>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-2 rounded-xl hover:bg-white/10 transition-all" title="Bookmark"><Bookmark className="w-5 h-5 text-white/80" /></button>
                    <button className="p-2 rounded-xl hover:bg-white/10 transition-all" title="Menu"><MoreVertical className="w-5 h-5 text-white/80" /></button>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-red-500/20 text-white/80 hover:text-white transition-all ml-2" title="Close Browser"><X className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Browser Content */}
            <div className="flex-1 p-4 overflow-hidden">
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-white">
                    <webview
                        ref={webviewRef}
                        src={currentUrl}
                        className="w-full h-full"
                        allowpopups="true"
                        webpreferences="contextIsolation=yes, nodeIntegration=no"
                        partition="persist:browser"
                    />
                </div>
            </div>
        </div>
    );
};

export default Browser;

document.addEventListener('DOMContentLoaded', () => {
	const proxyIconUrl = 'https://favicon-proxy.fduer.com/www.svgrepo.com/download/458759/json.svg'
	const storedIcon = localStorage.getItem('cachedFavicon')
	const lastFetchTime = localStorage.getItem('faviconLastFetchTime')
	const now = Date.now()
	const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000

	function setFavicon(svgData) {
		const favicon = document.getElementById('dynamic-favicon')
		if (favicon) {
			const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
			const url = URL.createObjectURL(svgBlob)
			favicon.href = url

			if (favicon.dataset.url) {
				URL.revokeObjectURL(favicon.dataset.url)
			}
			favicon.dataset.url = url
		} else {
			const newFavicon = document.createElement('link')
			newFavicon.id = 'dynamic-favicon'
			newFavicon.rel = 'icon'
			newFavicon.type = 'image/svg+xml'
			const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
			const url = URL.createObjectURL(svgBlob)
			newFavicon.href = url
			document.head.appendChild(newFavicon)
		}
	}

	if (storedIcon && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
		setFavicon(storedIcon)
	} else {
		fetch(proxyIconUrl)
			.then(response => {
				if (!response.ok) {
					throw new Error('Network response was not ok')
				}
				return response.text()
			})
			.then(svgData => {
				try {
					localStorage.setItem('cachedFavicon', svgData)
					localStorage.setItem('faviconLastFetchTime', now)
				} catch (e) {
					console.warn('LocalStorage 存储失败:', e)
				}
				setFavicon(svgData)
			})
			.catch(error => console.error('获取 SVG 图标失败:', error))
	}
})
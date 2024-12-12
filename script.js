// 在文件开头添加按钮相关的事件处理
document.addEventListener('DOMContentLoaded', function() {
	const buttons = document.querySelectorAll('.json-type-btn');
	buttons.forEach(button => {
		button.addEventListener('click', function() {
			buttons.forEach(btn => btn.classList.remove('active'));
			this.classList.add('active');
		});
	});
});

// 自定义扩展以处理数学公式，包括 \[ ... \] 和 [ ... ] 作为显示数学公式
marked.use({
	extensions: [{
		name: 'math',
		level: 'inline',
		start(src) { return src.match(/\\\(|\\\[/)?.index; },
		tokenizer(src, tokens) {
			// 使用 [\s\S]+? 来匹配包括换行符在内的所有字符
			const rule = /^\\\(([\s\S]+?)\\\)|^\\\[(?:\n)?([\s\S]+?)\\\]|^\[([\s\S]+?)\]/;
			const match = rule.exec(src);
			if (match) {
				if (match[1] !== undefined) { // \( ... \)
					return {
						type: 'math',
						raw: match[0],
						text: match[1],
						display: false
					};
				} else if (match[2] !== undefined) { // \[ ... \]
					return {
						type: 'math',
						raw: match[0],
						text: match[2],
						display: true
					};
				} else if (match[3] !== undefined) { // [ ... ]
					return {
						type: 'math',
						raw: match[0],
						text: match[3],
						display: true
					};
				}
			}
			return;
		},
		renderer(token) {
			if (token.display) {
				return `\\[${token.text}\\]`;
			} else {
				return `\\(${token.text}\\)`;
			}
		}
	}]
});

hljs.highlightAll();

function formatTimestamp(ts) {
	const date = new Date(ts * 1000);
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	const hh = String(date.getHours()).padStart(2, '0');
	const mm = String(date.getMinutes()).padStart(2, '0');
	const ss = String(date.getSeconds()).padStart(2, '0');
	return `${y}年${m}月${d}日 ${hh}:${mm}:${ss}`;
}

function addCopyButtons() {
	const pres = document.querySelectorAll('pre');
	pres.forEach(pre => {
		const code = pre.querySelector('code');
		if (code) {
			// 检查是否已经有复制按钮，避免重复添加
			if (pre.querySelector('.copy-button')) return;

			const button = document.createElement('button');
			button.classList.add('copy-button');
			button.textContent = 'Copy';
			button.addEventListener('click', function (event) {
				event.stopPropagation();
				navigator.clipboard.writeText(code.textContent).then(() => {
					button.textContent = 'Copied!';
					button.classList.add('copied');
					setTimeout(() => {
						button.textContent = 'Copy';
						button.classList.remove('copied');
					}, 2000);
				}).catch(() => {
					button.textContent = 'Failed!';
					button.classList.add('copied');
					setTimeout(() => {
						button.textContent = 'Copy';
						button.classList.remove('copied');
					}, 2000);
				});
			});
			pre.appendChild(button);
		}
	});
}

function adjustContainerWidth() {
	const messages = document.querySelectorAll('.message');
	messages.forEach(message => {
		message.style.width = 'auto';
		message.style.marginLeft = 'auto';
		message.style.marginRight = 'auto';
	});
}

document.getElementById('fileInput').addEventListener('change', function (event) {
	const file = event.target.files[0];
	if (!file) return;
	const reader = new FileReader();
	const loadingDiv = document.getElementById('loading');
	loadingDiv.classList.add('visible');

	reader.onload = function (e) {
		try {
			const jsonType = document.querySelector('.json-type-btn.active').dataset.value;
			const rawJson = JSON.parse(e.target.result);
			const contentDiv = document.getElementById('content');
			contentDiv.innerHTML = '';

			// 根据JSON类型选择不同的解析方法
			let messages;
			if (jsonType === 'debug') {
				messages = rawJson.messages || [];
			} else {
				// 处理网络响应JSON格式
				messages = [];
				// 判断是数组还是单个对象
				const conversations = Array.isArray(rawJson) ? rawJson : [rawJson];
				conversations.forEach(conversation => {
					const mapping = conversation.mapping || {};
					Object.values(mapping).forEach(node => {
						if (node.message) {
							messages.push(node.message);
						}
					});
				});
			}

			messages.forEach(msg => {
				const role = msg.author.role;
				const contentType = msg.content.content_type;
				const parts = msg.content.parts || [];
				const createTime = msg.create_time;
				const timeStr = createTime ? formatTimestamp(createTime) : '';
				const attachments = (msg.metadata && msg.metadata.attachments) || [];
				const attachmentInfo = attachments.map(att => {
					return `附件：${att.name} (${att.mime_type || 'unknown'})`;
				}).join(', ');

				let label = '';
				let messageDivClass = '';
				if (role === 'assistant') {
					let modelSlug = (msg.metadata && msg.metadata.model_slug) || 'Assistant';
					modelSlug = modelSlug.replace(/gpt/gi, match => match.toUpperCase());
					label = modelSlug;
					messageDivClass = 'system';
				} else if (role === 'user') {
					label = 'User';
					messageDivClass = 'user';
				} else if (role === 'tool') {
					let modelSlug = (msg.metadata && msg.metadata.model_slug);
					if (modelSlug) {
						modelSlug = modelSlug.replace(/gpt/gi, match => match.toUpperCase());
						label = `${modelSlug} (多模态准备)`;
					} else {
						modelSlug = 'Tool-' + msg.author.name;
						label = `${modelSlug} (思考)`;
					}
					messageDivClass = 'tool';
				} else if (role === 'system') {
					label = 'System';
					messageDivClass = 'system';
				} else {
					label = role;
					messageDivClass = 'system';
				}

				parts.forEach(part => {
					const messageDiv = document.createElement('div');
					messageDiv.classList.add('message');
					messageDiv.classList.add(messageDivClass);
					const headerDiv = document.createElement('div');
					headerDiv.classList.add('header');
					const labelDiv = document.createElement('div');
					labelDiv.classList.add('label');
					labelDiv.textContent = label;
					const timeDiv = document.createElement('div');
					timeDiv.classList.add('timestamp');
					timeDiv.textContent = timeStr;
					headerDiv.appendChild(labelDiv);
					headerDiv.appendChild(timeDiv);

					const contentDivInner = document.createElement('div');
					contentDivInner.classList.add('content');

					if (typeof part === 'string') {
						if (part.trim() === '') return;
						const processedPart = part.replace(/\\\\/g, '\\');
						contentDivInner.innerHTML = marked.parse(processedPart, {
							highlight: function (code, lang) {
								if (lang && hljs.getLanguage(lang)) {
									return hljs.highlight(code, { language: lang }).value;
								} else {
									return hljs.highlightAuto(code).value;
								}
							}
						});

						renderMathInElement(contentDivInner, {
							delimiters: [
								{ left: "$$", right: "$$", display: true },
								{ left: "$", right: "$", display: false },
								{ left: "\\(", right: "\\)", display: false },
								{ left: "\\[", right: "\\]", display: true },
								{ left: "[", right: "]", display: true }, // 支持 [ ... ] 作为显示数学公式
								{ left: "```math", right: "```", display: true }
							],
							throwOnError: false,
							errorColor: '#000',
							strict: 'ignore',
							trust: true,
							macros: { "\\text": "\\textrm" }
						});
					} else if (typeof part === 'object') {
						const partContentType = part.content_type;
						if (partContentType === 'image_asset_pointer') {
							const imageDiv = document.createElement('div');
							imageDiv.classList.add('image-placeholder');
							imageDiv.textContent = '[图片]';
							contentDivInner.appendChild(imageDiv);
						} else {
							const unknownDiv = document.createElement('div');
							unknownDiv.classList.add('unknown-content');
							unknownDiv.textContent = '[未知内容类型]';
							contentDivInner.appendChild(unknownDiv);
						}
					}

					messageDiv.appendChild(headerDiv);
					messageDiv.appendChild(contentDivInner);

					if (attachmentInfo) {
						const attachmentDiv = document.createElement('div');
						attachmentDiv.classList.add('attachment-info');
						attachmentDiv.textContent = attachmentInfo;
						messageDiv.appendChild(attachmentDiv);
					}

					if (role === 'tool') {
						messageDiv.classList.add('collapsed');
						messageDiv.addEventListener('click', function () {
							if (messageDiv.classList.contains('collapsed')) {
								contentDivInner.style.maxHeight = contentDivInner.scrollHeight + 'px';
								messageDiv.classList.remove('collapsed');
							} else {
								contentDivInner.style.maxHeight = contentDivInner.scrollHeight + 'px';
								void contentDivInner.offsetHeight;
								contentDivInner.style.maxHeight = '6rem';
								messageDiv.classList.add('collapsed');
							}
						});
					}

					contentDiv.appendChild(messageDiv);
				});
			});
			const container = document.getElementById('container');
			container.classList.add('loaded');
			addCopyButtons();
			hljs.highlightAll();

			adjustContainerWidth();

			loadingDiv.classList.remove('visible');

			const loadNewJsonButton = document.getElementById('load-new-json');
			loadNewJsonButton.classList.remove('hidden');
		} catch (err) {
			console.error(err);
			alert('无效的JSON文件');
			loadingDiv.classList.remove('visible');
		}
	};
	reader.readAsText(file);

	const titleContainer = document.getElementById('title-container');
	titleContainer.style.transition = 'all 0.7s ease';
	titleContainer.style.display = 'flex';
	titleContainer.style.textAlign = 'center';
	titleContainer.classList.add('no-margin');
	setTimeout(() => {
		titleContainer.style.justifyContent = 'flex-start';
	}, 10);
});

document.getElementById('load-new-json').addEventListener('click', function () {
	document.getElementById('content').innerHTML = '';
	document.getElementById('container').classList.remove('loaded');
	const titleContainer = document.getElementById('title-container');
	titleContainer.style.transition = 'all 0.7s ease';
	titleContainer.style.justifyContent = 'center';
	titleContainer.classList.remove('no-margin');
	this.classList.add('hidden');
	document.getElementById('fileInput').value = '';
});
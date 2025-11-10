// script.js - Notebook multi-file markdown editor
(function(){
	// Simple utility: generate id
	const uid = ()=>Math.random().toString(36).slice(2,10)

	// Storage key
	const STORAGE_KEY = 'notebook.files.v1'

	// Elements
	const filesEl = document.getElementById('files')
	const newBtn = document.getElementById('new-file')
	const searchEl = document.getElementById('search')
	const editorEl = document.getElementById('editor')
	const filenameEl = document.getElementById('filename')
	const previewEl = document.getElementById('preview-content')
	const saveBtn = document.getElementById('save')
	const renameBtn = document.getElementById('rename')
	const deleteBtn = document.getElementById('delete')
	const exportBtn = document.getElementById('export')

	// In-memory model
	let files = []
	let activeId = null
	let autosaveTimer = null

	// Init marked options
	marked.setOptions({gfm:true,breaks:true})

	// Load from localStorage
	function load(){
		try{
			const raw = localStorage.getItem(STORAGE_KEY)
			files = raw ? JSON.parse(raw) : []
		}catch(e){
			console.error('Failed to load files', e)
			files = []
		}
	}

	function saveAll(){
		localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
	}

	// Create a new file and activate it
	function createFile(title='Untitled', content=''){
		const id = uid()
		const file = {id, title, content, created: Date.now(), updated: Date.now()}
		files.unshift(file)
		saveAll()
		renderFileList()
		setActive(id)
		return file
	}

	function updateActive(changes){
		if(!activeId) return
		const f = files.find(x=>x.id===activeId)
		if(!f) return
		Object.assign(f, changes)
		f.updated = Date.now()
		saveAll()
		renderFileList()
	}

	function deleteActive(){
		if(!activeId) return
		const idx = files.findIndex(x=>x.id===activeId)
		if(idx===-1) return
		files.splice(idx,1)
		saveAll()
		activeId = files.length ? files[0].id : null
		renderFileList()
		renderActive()
	}

	function renameActive(newTitle){
		updateActive({title:newTitle})
		renderFileList()
	}

	function setActive(id){
		activeId = id
		renderFileList()
		renderActive()
	}

	function exportActive(){
		if(!activeId) return
		const f = files.find(x=>x.id===activeId)
		if(!f) return
		const blob = new Blob([f.content],{type:'text/markdown'})
		const a = document.createElement('a')
		a.href = URL.createObjectURL(blob)
		a.download = (f.title || 'note') + '.md'
		document.body.appendChild(a)
		a.click()
		a.remove()
	}

	// Render list
	function renderFileList(){
		filesEl.innerHTML = ''
		const q = (searchEl.value || '').toLowerCase()
		files.filter(f=>{
			if(!q) return true
			return f.title.toLowerCase().includes(q) || (f.content||'').toLowerCase().includes(q)
		}).forEach(f=>{
			const li = document.createElement('li')
			li.dataset.id = f.id
			li.className = f.id===activeId ? 'active' : ''
			const title = document.createElement('div')
			title.textContent = f.title
			const meta = document.createElement('div')
			meta.className='meta'
			meta.textContent = new Date(f.updated).toLocaleString()
			li.appendChild(title)
			li.appendChild(meta)
			li.addEventListener('click', ()=>setActive(f.id))
			filesEl.appendChild(li)
		})
	}

	function renderActive(){
		const f = files.find(x=>x.id===activeId)
		if(!f){
			filenameEl.value = ''
			editorEl.value = ''
			previewEl.innerHTML = '<p class="muted">No file selected — create a new note.</p>'
			return
		}
		filenameEl.value = f.title
		editorEl.value = f.content || ''
		renderPreview()
	}

	function renderPreview(){
		const md = editorEl.value || ''
		try{
			const html = marked.parse(md)
			previewEl.innerHTML = DOMPurify.sanitize(html)
		}catch(e){
			previewEl.innerHTML = '<pre class="muted">Error rendering preview</pre>'
		}
	}

	// Autosave logic (debounced)
	function scheduleAutosave(){
		if(autosaveTimer) clearTimeout(autosaveTimer)
		autosaveTimer = setTimeout(()=>{
			if(!activeId) return
			updateActive({content: editorEl.value})
			renderPreview()
		}, 600)
	}

	// Event bindings
	newBtn.addEventListener('click', ()=>createFile())
	saveBtn.addEventListener('click', ()=>updateActive({content:editorEl.value}))
	renameBtn.addEventListener('click', ()=>{
		if(!activeId) return
		const newName = prompt('Rename file', filenameEl.value || 'Untitled')
		if(newName) renameActive(newName)
	})
	deleteBtn.addEventListener('click', ()=>{
		if(!activeId) return
		if(confirm('Delete this file?')) deleteActive()
	})
	exportBtn.addEventListener('click', exportActive)

	// editor input
	editorEl.addEventListener('input', ()=>{
		scheduleAutosave()
		renderPreview()
	})

	// filename change (save title)
	filenameEl.addEventListener('change', ()=>{
		if(!activeId) return
		renameActive(filenameEl.value || 'Untitled')
	})

	// search
	searchEl.addEventListener('input', ()=>renderFileList())

	// Keyboard shortcuts
	window.addEventListener('keydown', (e)=>{
		// Ctrl+S to save
		if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='s'){
			e.preventDefault()
			updateActive({content:editorEl.value})
		}
		// Ctrl+Alt+N new
		if(e.ctrlKey && e.altKey && e.key.toLowerCase()==='n'){
			e.preventDefault()
			createFile()
		}
	})

	// Initial load and seed default file
	load()
	if(!files.length) createFile('Welcome', '# Welcome\n\nThis is your notebook. Create more files with the "New" button. Your notes are kept in localStorage in this browser.')
	else activeId = files[0].id
	renderFileList()
	renderActive()

	// Expose small API to window for debugging
	window.Notebook = {createFile, files, saveAll}
})();


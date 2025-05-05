document.addEventListener('DOMContentLoaded', () => {
    // --- Глобальные переменные и состояние приложения ---
    let currentUserNickname = localStorage.getItem('userNickname'); 
    let stories = []; 
    let currentStory = null; 
    let currentChapterId = null; 
    let userPath = [];
    let synth = window.speechSynthesis; 
    let voices = []; 
    let currentUtterance = null;
    let activeTTSControls = null; 

    // --- Базовый URL API ---
    const API_BASE_URL = '/api'; 
    // Экраны
    const nicknameScreen = document.getElementById('nickname-screen');
    const mainAppScreen = document.getElementById('main-app');
    const storyListScreen = document.getElementById('story-list-screen');
    const storyEditorScreen = document.getElementById('story-editor-screen');
    const storyReaderScreen = document.getElementById('story-reader-screen');
    const finalScreen = document.getElementById('final-screen');
    const viewPlaythroughScreen = document.getElementById('view-playthrough-screen');

    // Элементы экрана никнейма
    const nicknameInput = document.getElementById('nickname-input');
    const saveNicknameBtn = document.getElementById('save-nickname-btn');
    const nicknameError = document.getElementById('nickname-error');
    const welcomeMessage = document.getElementById('welcome-message');

    // Элементы экрана списка историй
    const storiesContainer = document.getElementById('stories-container');
    const createStoryBtn = document.getElementById('create-story-btn');
    const changeNicknameBtn = document.getElementById('change-nickname-btn');
    const loadingIndicator = document.getElementById('loading-indicator'); // Индикатор загрузки

    // Элементы редактора историй
    const editorBackBtn = document.getElementById('editor-back-btn');
    const storyTitleInput = document.getElementById('story-title-input');
    const chaptersEditorContainer = document.getElementById('chapters-container');
    const saveStoryBtn = document.getElementById('save-story-btn');
    const editorMessage = document.getElementById('editor-message');
    const addChapterInnerBtn = document.getElementById('add-chapter-btn-inner'); // Кнопка "+" для добавления главы

    // Элементы экрана чтения
    const readerStoryTitle = document.getElementById('reader-story-title');
    const readerBackBtn = document.getElementById('reader-back-btn');
    const readerChapterText = document.getElementById('reader-chapter-text'); // Текст главы для чтения
    const readerActionsContainer = document.getElementById('reader-actions-container'); // Контейнер кнопок действий
    // Элементы TTS для экрана чтения
    const ttsControlsContainer = document.getElementById('tts-controls');
    const ttsPlayBtn = document.getElementById('tts-play-btn');
    const ttsStopBtn = document.getElementById('tts-stop-btn');
    const ttsVoiceSelect = document.getElementById('tts-voice-select');
    const ttsStatus = document.getElementById('tts-status');

    // Элементы финального экрана
    const finalStoryTitle = document.getElementById('final-story-title');
    const finalMessage = document.getElementById('final-message'); // Текст финального сообщения
    const finalPath = document.getElementById('final-path'); // Отображение пути
    const finalBackBtn = document.getElementById('final-back-btn');
    const savePlaythroughBtn = document.getElementById('save-playthrough-btn');
    const finalSaveStatus = document.getElementById('final-save-status'); // Статус сохранения прохождения
    // Элементы TTS для финального экрана
    const ttsFinalControlsContainer = document.getElementById('tts-final-controls');
    const ttsFinalPlayBtn = document.getElementById('tts-final-play-btn');
    const ttsFinalStopBtn = document.getElementById('tts-final-stop-btn');
    const ttsFinalVoiceSelect = document.getElementById('tts-final-voice-select');
    const ttsFinalStatus = document.getElementById('tts-final-status');

    // Элементы экрана просмотра прохождения
    const viewPlaythroughStoryTitle = document.getElementById('view-playthrough-story-title');
    const viewBackBtn = document.getElementById('view-back-btn');
    const viewPlaythroughRenderArea = document.getElementById('view-playthrough-render-area'); // Область для генерации картинки
    const viewPlaythroughDetails = document.getElementById('view-playthrough-details');
    const viewReaderNickname = document.getElementById('view-reader-nickname');
    const viewOriginalStoryTitle = document.getElementById('view-original-story-title');
    const viewFormattedPath = document.getElementById('view-formatted-path');
    const viewPlaythroughError = document.getElementById('view-playthrough-error');
    const downloadImageBtn = document.getElementById('download-image-btn'); // Кнопка скачивания картинки
    const shareButtonsContainer = document.querySelector('#view-playthrough-screen .share-buttons'); // Контейнер кнопок "Поделиться"

    // Шаблоны для динамического создания элементов
    const chapterTemplate = document.getElementById('chapter-template');
    const actionTemplate = document.getElementById('action-template');

    // --- Функции ---
    function showLoading(isLoading) {
        loadingIndicator.classList.toggle('hidden', !isLoading);
    }
    function showScreen(screenToShow) {
        // Сначала скрыть все экраны
        [nicknameScreen, mainAppScreen, storyListScreen, storyEditorScreen, storyReaderScreen, finalScreen, viewPlaythroughScreen].forEach(screen => {
             if (screen) screen.classList.add('hidden');
        });
        // Остановить озвучку, если переходим с экрана, где она могла работать
        if (synth && (synth.speaking || synth.pending || synth.paused)) {
             if (activeTTSControls && screenToShow !== activeTTSControls.screen) {
                  console.log(`Навигация с ${activeTTSControls.screen.id}, остановка озвучки.`);
                  stopSpeech();
             }
        }
         // Сбросить трекер активных контролов TTS при переходе на экраны без TTS
         if (screenToShow !== storyReaderScreen && screenToShow !== finalScreen) {
             activeTTSControls = null;
         }

        showLoading(false); // Скрыть индикатор загрузки после остановки TTS

        if (screenToShow) {
            screenToShow.classList.remove('hidden'); // Показать целевой экран

            // Обеспечить видимость основного контейнера приложения
            const mainAppScreens = [storyListScreen, storyEditorScreen, storyReaderScreen, finalScreen, viewPlaythroughScreen];
            if (mainAppScreens.includes(screenToShow)) {
                mainAppScreen.classList.remove('hidden');
                // Скрыть другие экраны внутри основного контейнера
                mainAppScreens.forEach(childScreen => {
                     if (childScreen && childScreen !== screenToShow) {
                         childScreen.classList.add('hidden');
                     }
                 });
            }
            // Инициализировать TTS, если целевой экран его поддерживает
            if (screenToShow === storyReaderScreen || screenToShow === finalScreen) {
                initializeTTS(screenToShow);
            }
        }
    }

    //Загружает список историй с сервера и отображает их.
    async function loadAndRenderStories() {
        activeTTSControls = null; // Сбросить активные контролы TTS
        showLoading(true);
        storiesContainer.innerHTML = ''; // Очистить контейнер
        try {
            const response = await fetch(`${API_BASE_URL}/stories`);
            if (!response.ok) throw new Error(`HTTP ошибка! статус: ${response.status}`);
            stories = await response.json();

            if (stories.length === 0) {
                storiesContainer.innerHTML = '<p>Пока нет доступных историй. Создайте свою!</p>';
            } else {
                stories.forEach(story => {
                    const storyDiv = document.createElement('div');
                    storyDiv.classList.add('story-item');
                    storyDiv.dataset.storyId = story._id; // Сохраняем ID истории

                    // Экранирование HTML в названии и авторе
                    const title = story.title?.replace(/</g, "<") || 'Без названия';
                    const author = story.authorNickname?.replace(/</g, "<") || 'Неизвестен';
                    storyDiv.innerHTML = `<h3>${title}</h3><p>Автор: ${author}</p>`;

                    // Добавление обработчика клика для начала чтения
                    storyDiv.addEventListener('click', () => startReadingStory(story._id));
                    storiesContainer.appendChild(storyDiv);
                });
            }
        } catch (error) {
            console.error('Ошибка при загрузке историй:', error);
            storiesContainer.innerHTML = `<p class="error-message">Не удалось загрузить истории: ${error.message}</p>`;
        } finally {
            showLoading(false);
            showScreen(storyListScreen); // Показать экран списка историй
        }
    }

    // Загружает данные конкретной истории и начинает процесс чтения.
    
    async function startReadingStory(storyId) {
        showLoading(true);
        currentStory = null; // Сбросить текущую историю
        activeTTSControls = null; // Сбросить TTS трекер
        try {
            const response = await fetch(`${API_BASE_URL}/stories/${storyId}`);
            if (!response.ok) {
                 if (response.status === 404) throw new Error("История не найдена.");
                 let errorMsg = `HTTP ошибка! статус: ${response.status}`;
                 try { const errData = await response.json(); errorMsg = errData.error || JSON.stringify(errData); } catch (e) {}
                 throw new Error(errorMsg);
             }
            currentStory = await response.json();

            // Валидация загруженных данных истории
             if (!currentStory?.chapters || typeof currentStory.chapters !== 'object' || Object.keys(currentStory.chapters).length === 0) {
                 throw new Error("Ошибка в данных истории: главы отсутствуют или имеют неверный формат.");
             }
            if (!currentStory.startChapterId || !currentStory.chapters[currentStory.startChapterId]) {
                 throw new Error("Ошибка в данных истории: отсутствует или неверно указана начальная глава.");
            }

            // Инициализация состояния чтения
            currentChapterId = currentStory.startChapterId;
            userPath = []; // Очистить путь пользователя
            readerStoryTitle.textContent = currentStory.title; // Установить заголовок

            renderChapter(currentChapterId); // Отобразить первую главу
            showScreen(storyReaderScreen); // Показать экран чтения 
        } catch (error) {
            console.error("Ошибка при загрузке истории для чтения:", error);
             // Отобразить ошибку
             const errorContainer = storiesContainer || document.body;
             const errorP = document.createElement('p');
             errorP.className = 'error-message';
             errorP.textContent = `Не удалось загрузить историю: ${error.message}`;
             storiesContainer.innerHTML = ''; // Очистить, если там что-то было
             storiesContainer.appendChild(errorP);
            showScreen(storyListScreen); // Вернуться к списку при ошибке
        } finally {
             showLoading(false);
        }
    }

    // Отображает текст и действия текущей главы на экране чтения.
    
    function renderChapter(chapterId) {
        // Остановить озвучку предыдущей главы (если она была)
        if (activeTTSControls?.screen === storyReaderScreen) {
             stopSpeech();
        }

        if (!currentStory?.chapters) {
           // Если данные истории пропали - перейти к экрану финала с ошибкой
           showFinalScreen(chapterId, "Ошибка: Данные истории не загружены.");
            return;
        }
        const chapter = currentStory.chapters[chapterId];
        if (!chapter) {
            // Если запрошенная глава не найдена - считаем это концом пути
           showFinalScreen(chapterId, "Глава не найдена. Вы достигли конца этого пути.");
            return;
        }

        // Отобразить текст главы
        readerChapterText.textContent = chapter.text;
        readerActionsContainer.innerHTML = ''; // Очистить предыдущие действия

        // Отобразить действия или перейти к финалу, если действий нет
        if (chapter.actions?.length > 0) {
            chapter.actions.forEach((action, index) => {
                const actionButton = document.createElement('button');
                 // Экранирование текста действия перед вставкой
                 actionButton.textContent = action.text?.replace(/</g, "<") || '...';
                // Добавляние обработчика для выбора действия
                actionButton.addEventListener('click', () => handleActionChoice(chapterId, index, action.nextChapterId));
                readerActionsContainer.appendChild(actionButton);
            });

             // Показ контрола TTS для читалки
             if (synth && ttsControlsContainer) {
                ttsControlsContainer.classList.remove('hidden');
            }
        } else {
            // Глава без действий - это финал
            showFinalScreen(chapterId);
        }
    }

    //Обрабатывание выбора действия игроком
    function handleActionChoice(chosenChapterId, actionIndex, nextChapterId) {
        userPath.push([chosenChapterId, actionIndex]); // Записать выбор в путь

        // Проверить, существует ли следующая глава
        if (nextChapterId && currentStory.chapters[nextChapterId]) {
            // Перейти к следующей главе
            currentChapterId = nextChapterId;
            renderChapter(currentChapterId);
        } else {
            // Если ID следующей главы нет или такой главы нет в истории - это финал
             currentChapterId = nextChapterId || chosenChapterId; // Запомнить ID
            showFinalScreen(currentChapterId); // Показать финальный экран
        }
    }

    // Отображает финальный экран истории.
  
    function showFinalScreen(finalChapterId, customMessage = null) {
        // Остановить озвучку, если переходим с экрана чтения
        if (activeTTSControls?.screen === storyReaderScreen) {
             stopSpeech();
        }
        // Сбрасывание состояние финального экрана перед отображением
        finalMessage.textContent = '';
        finalPath.innerHTML = '';
        finalSaveStatus.textContent = '';
        finalSaveStatus.style = ''; // Сбрасывание стилей статуса
        savePlaythroughBtn.disabled = false; // Включение сохранения
        savePlaythroughBtn.classList.remove('hidden');
        // Скрывание контролов TTS до готовности текста
         if (ttsFinalControlsContainer) ttsFinalControlsContainer.classList.add('hidden');

        // Проверка наличия данных истории
        if (!currentStory) {
            finalStoryTitle.textContent = "История не загружена";
            finalMessage.textContent = "Не удалось загрузить данные истории для отображения финала.";
            savePlaythroughBtn.classList.add('hidden'); // Скрывание кнопки сохранения
            showScreen(finalScreen); // Показ экран с ошибкой
            return;
        }

        // Установка заголовок финала
        finalStoryTitle.textContent = currentStory.title + " - Финал";

        // Определение текста финального сообщения
        let determinedFinalMessage = "История завершена."; // Сообщение по умолчанию
        const finalChapterData = finalChapterId ? currentStory.chapters?.[finalChapterId] : null;

        if (customMessage) { // Если передано особое сообщение - ошибка
            determinedFinalMessage = customMessage;
        } else if (finalChapterData) { // Если есть данные финальной главы
            determinedFinalMessage = finalChapterData.text || "Вы достигли конца этого пути.";
        } else if (finalChapterId) { // Если ID финала есть, но данных нет
             determinedFinalMessage = `Вы достигли главы (${finalChapterId}), но её текст не найден. История завершена.`;
        } else { // Если ID финала не был передан (например из handleActionChoice)
             determinedFinalMessage = "Вы завершили свой путь.";
        }
        finalMessage.textContent = determinedFinalMessage; // Установка текста финала

        // Отображение пройденного пути
        let pathString = "Начало";
        userPath.forEach(step => {
            if (!Array.isArray(step) || step.length !== 2) return; // Пропуск некорректных шагов
            const [chapId, actIndex] = step;
            const chapter = currentStory.chapters?.[chapId];
            if (chapter?.actions?.[actIndex]) {
                 // Экранирование текста действия
                 const actionText = chapter.actions[actIndex].text?.replace(/</g, "<") || '(действие)';
                pathString += ` → "${actionText}"`;
            } else {
                // Если данные изменились или были некорректны
                pathString += ` → (Шаг: ${chapId?.replace(/</g,"<")}[${actIndex}])`;
            }
        });
        finalPath.innerHTML = pathString; // Отображение пути

        // Показ контролов TTS для финального экрана
        if (synth && ttsFinalControlsContainer) {
             ttsFinalControlsContainer.classList.remove('hidden');
        }

        showScreen(finalScreen); // Показ финального экран (вызов initializeTTS)
    }

    // --- Редактор историй ---
    let editorChapterCounter = 0; // Счетчик для генерации временных ID новых глав

    // Сбрасывает состояние редактора к начальному.
     
    function resetEditor() {
        storyTitleInput.value = ''; // Очистка название
        // Удаление всех существующие элементов глав из контейнера
        const existingChapters = chaptersEditorContainer.querySelectorAll('.chapter-editor');
        existingChapters.forEach(ch => ch.remove());
        // Сброс ID стартовой главы
        chaptersEditorContainer.dataset.startChapterId = '';
        editorChapterCounter = 0; // Сброс счетчика временных ID
        editorMessage.textContent = ''; // Очистка сообщения редактора
        editorMessage.style = ''; // Сброс стилей сообщений
        addChapterToEditor(); // Добавление первой пустой главы
    }

    // Добавление новой главы в редактор
    
    function addChapterToEditor(chapterData = null) {
        // Генерация временного ID для UI, если глава новая
        const tempUiId = chapterData?.id ?? `new_chapter_${editorChapterCounter++}`;
        const chapterNode = chapterTemplate.content.cloneNode(true); // Клонирование шаблона главы
        const chapterDiv = chapterNode.querySelector('.chapter-editor');
        chapterDiv.dataset.intendedChapterId = tempUiId; // Сохранение ID в data-атрибуте

        // Получение элементов управления внутри главы
        const idInput = chapterDiv.querySelector('.chapter-id-input');
        const textInput = chapterDiv.querySelector('.chapter-text-input');
        const actionsContainer = chapterDiv.querySelector('.actions-editor-container');
        const addActionButton = chapterDiv.querySelector('.add-action-btn');
        const removeChapterButton = chapterDiv.querySelector('.remove-chapter-btn');
        const setStartButton = chapterDiv.querySelector('.set-start-chapter-btn');
        const aiContinueBtn = chapterDiv.querySelector('.ai-continue-btn');
        const aiSuggestActionsBtn = chapterDiv.querySelector('.ai-suggest-actions-btn');

        idInput.value = tempUiId; // Предзаполнение ID

        // Если переданы данные, заполняются поля
        if (chapterData) {
            textInput.value = chapterData.text || '';
            if (chapterData.actions && Array.isArray(chapterData.actions)) {
                chapterData.actions.forEach(action => addActionToEditor(actionsContainer, action));
            }
        }

        // Настройка состояние кнопки "Сделать стартовой"
        const currentStartId = chaptersEditorContainer.dataset.startChapterId;
        const isCurrentlyStart = (currentStartId && tempUiId === currentStartId);
        setStartButton.disabled = isCurrentlyStart; // Отключение, если уже стартовая
        idInput.placeholder = isCurrentlyStart ? "ID Главы (Стартовая)" : "ID Главы";
        chapterDiv.classList.toggle('start-chapter', isCurrentlyStart); // Добавление/удаление класс

        // --- Обработчики событий для кнопок внутри главы ---
        addActionButton.addEventListener('click', () => addActionToEditor(actionsContainer));

        removeChapterButton.addEventListener('click', (e) => {
            const chapterElement = e.target.closest('.chapter-editor');
            if (!chapterElement) return; // Элемент не найден
            const removedId = chapterElement.dataset.intendedChapterId;
            const wasStart = chapterElement.classList.contains('start-chapter');
            chapterElement.remove(); // Удаление главу из DOM

            // Если удалили стартовую главу
            if (wasStart) {
                chaptersEditorContainer.dataset.startChapterId = ''; // Сброс ID стартовой
                // Назначение первой из оставшихся глав стартовой
                const firstChapter = chaptersEditorContainer.querySelector('.chapter-editor');
                if (firstChapter) {
                     const newStartId = firstChapter.dataset.intendedChapterId;
                     chaptersEditorContainer.dataset.startChapterId = newStartId;
                     firstChapter.classList.add('start-chapter');
                     firstChapter.querySelector('.chapter-id-input').placeholder = "ID Главы (Стартовая)";
                     firstChapter.querySelector('.set-start-chapter-btn').disabled = true;
                }
            }
            // Гарантирование, что хотя бы одна глава всегда есть
            if (chaptersEditorContainer.querySelectorAll('.chapter-editor').length === 0) {
                 addChapterToEditor();
            }
       });

       setStartButton.addEventListener('click', (e) => {
           const targetChapterElement = e.target.closest('.chapter-editor');
           if (!targetChapterElement) return;
           const newStartId = targetChapterElement.dataset.intendedChapterId;
           const oldStartChapter = chaptersEditorContainer.querySelector('.start-chapter');

           // Ничего не делать, если кликнули по уже стартовой главе
           if (targetChapterElement.classList.contains('start-chapter')) return;

           // Убрать статус стартовой с предыдущей главы (если она была)
           if (oldStartChapter) {
               oldStartChapter.classList.remove('start-chapter');
               oldStartChapter.querySelector('.chapter-id-input').placeholder = "ID Главы";
               oldStartChapter.querySelector('.set-start-chapter-btn').disabled = false;
           }
            // Назначение текущей главы стартовой
            targetChapterElement.classList.add('start-chapter');
            targetChapterElement.querySelector('.chapter-id-input').placeholder = "ID Главы (Стартовая)";
            e.target.disabled = true; // Отключение кнопки на новой стартовой 
            chaptersEditorContainer.dataset.startChapterId = newStartId; // Запоминание ID
       });

       // Обработка для кнопок AI
       if (aiContinueBtn) aiContinueBtn.addEventListener('click', handleAiContinue);
       if (aiSuggestActionsBtn) aiSuggestActionsBtn.addEventListener('click', handleAiSuggestActions);

        // Добавление созданного элемента главы в контейнер
        chaptersEditorContainer.appendChild(chapterNode);

        // Автоматическое назначение первой добавленной главы стартовой, если еще ни одна не выбрана
        if (!chaptersEditorContainer.dataset.startChapterId && chaptersEditorContainer.querySelectorAll('.chapter-editor').length === 1) {
            chaptersEditorContainer.dataset.startChapterId = tempUiId;
            chapterDiv.classList.add('start-chapter');
            idInput.placeholder = "ID Главы (Стартовая)";
            setStartButton.disabled = true;
        }
    }

    // Обработчик кнопки "Продолжить с AI"
    async function handleAiContinue(e) {
        const button = e.target;
        const chapterEditor = button.closest('.chapter-editor');
        if (!chapterEditor) return;
        const textInput = chapterEditor.querySelector('.chapter-text-input');
        const currentText = textInput.value;
        if (!currentText.trim()) { alert("Введите текст главы для продолжения."); return; }

        button.textContent = 'Думает...'; button.disabled = true; showLoading(true);
        try {
            // Отправление запроса на бэкенд
            const response = await fetch(`${API_BASE_URL}/ai/continue`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: currentText }) });
            if (!response.ok) { let errorMsg = `AI Ошибка: ${response.status}`; try { const errData = await response.json(); errorMsg = errData.error || JSON.stringify(errData); } catch (parseErr) {} throw new Error(errorMsg); }
            const data = await response.json();
            // Добавление полученного продолжение к тексту
            textInput.value += (textInput.value ? ' ' : '') + (data.continuation || '');
        } catch (error) {
            console.error("Ошибка продолжения текста AI:", error);
            alert(`Не удалось получить продолжение: ${error.message}`);
        } finally {
            // Восстанавление состояние кнопки
            button.textContent = 'Продолжить с AI';
            button.disabled = false;
            showLoading(false);
        }
    }

    // Обработчик кнопки "Предложить действия"
    async function handleAiSuggestActions(e) {
        const button = e.target;
        const chapterEditor = button.closest('.chapter-editor');
        if (!chapterEditor) return;
        const textInput = chapterEditor.querySelector('.chapter-text-input');
        const actionsContainer = chapterEditor.querySelector('.actions-editor-container');
        const chapterText = textInput.value;
        if (!chapterText.trim()) { alert("Введите текст главы, чтобы ИИ предложил действия."); return; }

        button.textContent = 'Думает...'; button.disabled = true; showLoading(true);
        try {
            // Запрос к API за вариантами действий
            const response = await fetch(`${API_BASE_URL}/ai/suggest-actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: chapterText }) });
            if (!response.ok) { let errorMsg = `AI Ошибка: ${response.status}`; try { const errData = await response.json(); errorMsg = errData.error || JSON.stringify(errData); } catch (parseErr) {} throw new Error(errorMsg); }
            const data = await response.json();

            // Добавление предложенных действий в редактор
            if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
                data.actions.forEach(actionText => {
                    if (typeof actionText === 'string' && actionText.trim()) {
                         // Добавляние каждого предложенного действия
                         addActionToEditor(actionsContainer, { text: actionText.trim(), nextChapterId: '' });
                    }
                });
            } else {
                 alert("ИИ не предложил действий.");
            }
        } catch (error) {
            console.error("Ошибка предложений действий AI:", error);
            alert(`Не удалось получить предложенные действия: ${error.message}`);
        } finally {
            // Восстанавление кнопки
            button.textContent = 'Предложить действия';
            button.disabled = false;
            showLoading(false);
        }
    }
    function addActionToEditor(actionsContainer, actionData = null) {
        const actionNode = actionTemplate.content.cloneNode(true); // Клонирование шаблона действия
        // Получение элементов управления внутри действия
        const textInput = actionNode.querySelector('.action-text-input');
        const nextChapterInput = actionNode.querySelector('.action-next-chapter-input');
        const removeButton = actionNode.querySelector('.remove-action-btn');

        // Заполнение данными, если они есть
        if (actionData) {
            textInput.value = actionData.text || '';
            nextChapterInput.value = actionData.nextChapterId || '';
        }

        // Обработчик кнопки удаления действия
        removeButton.addEventListener('click', (e) => {
             const editorToRemove = e.target.closest('.action-editor');
             if (editorToRemove) editorToRemove.remove(); // Удаление элемента действия
        });

        actionsContainer.appendChild(actionNode); // Добавление элемента в контейнер
    }

    // Сбор данных из редактора, их валидация и возвращение на объект истории для отправки на сервер.
    function buildStoryFromEditor() {
        const storyTitle = storyTitleInput.value.trim();
        const startChapterId = chaptersEditorContainer.dataset.startChapterId;
        const chaptersMap = {}; // Использование объекта для глав
        editorMessage.textContent = ''; editorMessage.style = ''; // Очистка сообщения

        //  Валидация
        if (!storyTitle) {
            editorMessage.textContent = "Укажите название истории.";
            editorMessage.style.color = 'red';
            storyTitleInput.focus(); // Фокусировка на поле названия
            return null;
        }
        if (!startChapterId) {
            editorMessage.textContent = "Назначьте стартовую главу (нажмите 'Сделать стартовой').";
            editorMessage.style.color = 'red';
            return null;
        }
        const chapterDivs = chaptersEditorContainer.querySelectorAll('.chapter-editor');
        if (chapterDivs.length === 0) {
            editorMessage.textContent = "Добавьте хотя бы одну главу.";
            editorMessage.style.color = 'red';
            return null;
        }

        //Детальная валидация глав и действий
        let chapterIds = new Set(); // Для проверки уникальности ID глав
        let allNextChapterIds = new Set(); // Для проверки существования ссылок
        let isValid = true; // Флаг валидности

        // Проход по всем элементам глав в редакторе
        for (const chapterDiv of chapterDivs) {
            const chapterIdInput = chapterDiv.querySelector('.chapter-id-input');
            const chapterId = chapterIdInput.value.trim();
            const chapterText = chapterDiv.querySelector('.chapter-text-input').value.trim();

            // Валидация ID главы
            if (!chapterId) {
                editorMessage.textContent = `Одна из глав не имеет ID.`;
                isValid = false; chapterIdInput.focus(); break; // Остановка проверки
            }
             // Проверка формата ID (буквы, цифры, _, -, .)
            if (!/^[a-zA-Z0-9_.-]+$/.test(chapterId)) {
                 editorMessage.textContent = `ID главы "${chapterId}" содержит недопустимые символы.`;
                 isValid = false; chapterIdInput.focus(); break;
             }
             // Проверка уникальности ID
            if (chapterIds.has(chapterId)) {
                editorMessage.textContent = `ID главы "${chapterId}" не уникален.`;
                isValid = false; chapterIdInput.focus(); break;
            }
             // Проверка наличия текста главы
             if (!chapterText) {
                 editorMessage.textContent = `Глава с ID "${chapterId}" не имеет текста.`;
                 isValid = false; chapterDiv.querySelector('.chapter-text-input').focus(); break;
             }
            chapterIds.add(chapterId); // Добавление валидного ID в набор

            // Валидация действий внутри главы
            const chapterObj = { text: chapterText, actions: [] };
            const actionDivs = chapterDiv.querySelectorAll('.action-editor');
            for (const [index, actionDiv] of actionDivs.entries()) {
                 const actionTextInput = actionDiv.querySelector('.action-text-input');
                 const actionText = actionTextInput.value.trim();
                 const nextChapterIdInput = actionDiv.querySelector('.action-next-chapter-input');
                const nextChapterId = nextChapterIdInput.value.trim();
                 if (!actionText) {
                    editorMessage.textContent = `Действие ${index + 1} в главе "${chapterId}" не имеет текста.`;
                    isValid = false; actionTextInput.focus(); break; // Остановка проверки действий
                }
                 // Валидация формата ID следующей главы (если указан)
                if (nextChapterId && !/^[a-zA-Z0-9_.-]+$/.test(nextChapterId)) {
                    editorMessage.textContent = `ID след. главы "${nextChapterId}" (действие ${index + 1}, глава "${chapterId}") имеет неверный формат.`;
                    isValid = false; nextChapterIdInput.focus(); break;
                }

                // Добавление валидного действия
                chapterObj.actions.push({ text: actionText, nextChapterId: nextChapterId || null }); // null если ID не указан
                if (nextChapterId) {
                     allNextChapterIds.add(nextChapterId); // Сбор всех ID, на которые есть ссылки
                }
            }
             if (!isValid) break; // Остановка проверки глав, если действие невалидно

            chaptersMap[chapterId] = chapterObj; // Добавление валидной главы в карту
        }

        if (!isValid) {
            editorMessage.style.color = 'red';
            return null; // Общая валидация не пройдена
        }

        // Проверка, что все ID, на которые ссылаются действия, существуют как главы
        for (const nextId of allNextChapterIds) {
            if (!chapterIds.has(nextId)) {
                editorMessage.textContent = `Действие ссылается на несуществующий ID главы "${nextId}".`;
                editorMessage.style.color = 'red';
                return null;
            }
        }

        // Финальная проверка: существует ли глава с назначенным стартовым ID
        if (!chaptersMap[startChapterId]) {
            editorMessage.textContent = `Стартовая глава с ID "${startChapterId}" не найдена среди созданных.`;
             editorMessage.style.color = 'red';
            return null;
        }

        // Если все проверки пройдены успешно
        editorMessage.textContent = "";
        return { // Возвращение готового объекта в истории
            title: storyTitle,
            authorNickname: currentUserNickname || 'Аноним', // Гарантирование наличие ника
            startChapterId: startChapterId,
            chapters: chaptersMap // Карта глав
        };
    }

    // --- ЛОГИКА ПРОСМОТРА ПРОХОЖДЕНИЯ ---

    // Обработка изменения хэша в URL (для навигации к просмотру прохождения).
    async function handleHashChange() {
        stopSpeech(); // Остановка озвучки при любой навигации

        const hash = window.location.hash;
        activeTTSControls = null; // Сброс трекера TTS

        if (hash.startsWith('#view/')) {
            const playthroughId = hash.substring('#view/'.length);
            // Проверка формата ID (24 hex символа)
            if (playthroughId && /^[a-fA-F0-9]{24}$/.test(playthroughId)) {
                await loadAndShowPlaythrough(playthroughId); // Загрузка и показ прохождения
            } else {
                // Невалидный ID в хэше
                console.warn("Некорректный ID прохождения в хэше:", playthroughId);
                window.location.hash = ''; // Очистить хэш
                // Возвращение к списку или экрану ника
                if (currentUserNickname) loadAndRenderStories(); else showScreen(nicknameScreen);
            }
        } else {
            // Хэш не для просмотра или отсутствует
            if (currentUserNickname) {
                 // Показ списка историй, если пользователь не находится активно на другом экране
                 const activeMainScreen = Array.from(mainAppScreen.children).find(
                     el => el.classList.contains('screen') && !el.classList.contains('hidden')
                 );
                 // Показ списка, только если нет активного экрана, или это список/просмотр
                 if (!activeMainScreen || activeMainScreen === storyListScreen || activeMainScreen === viewPlaythroughScreen) {
                      loadAndRenderStories();
                 }
                 // Иначе остаемся на текущем экране (редактор, читалка, финал)
            } else {
                // Пользователь не авторизован - показать экран ввода ника
                showScreen(nicknameScreen);
            }
        }
    }

    // Загружка данных прохождения и соответствующей истории для отображения.
    async function loadAndShowPlaythrough(playthroughId) {
        showLoading(true);
        // Сброс состояние экрана просмотра
        viewPlaythroughDetails.classList.add('hidden');
        viewPlaythroughError.textContent = '';
        viewPlaythroughError.style = '';
        downloadImageBtn.classList.add('hidden');
        shareButtonsContainer.classList.add('hidden');
        showScreen(viewPlaythroughScreen); // Показ структуры экрана

        try {
            // Загрузка данных самого прохождения
            const response = await fetch(`${API_BASE_URL}/playthroughs/${playthroughId}`);
            if (!response.ok) {
                if (response.status === 404) throw new Error("Прохождение не найдено.");
                let errorMsg = `Ошибка сервера (${response.status})`;
                try { const errData = await response.json(); errorMsg = errData.error || JSON.stringify(errData); } catch (e) {}
                throw new Error(errorMsg);
            }
            const playthroughData = await response.json();

            // Получение ID оригинальной истории (может быть вложено Mongoose)
            const storyIdToFetch = playthroughData.storyId?._id || playthroughData.storyId;
            if (!storyIdToFetch) throw new Error("Не найден ID оригинальной истории в данных прохождения.");

            // Загрузка данных оригинальной истории для интерпретации пути
            const storyResponse = await fetch(`${API_BASE_URL}/stories/${storyIdToFetch}`);
            if (!storyResponse.ok) {
                 let errorMsg = `Не удалось загрузить оригинальную историю (${storyResponse.status})`;
                 // Особое сообщение, если история была удалена
                 if (storyResponse.status === 404) errorMsg = `Оригинальная история (ID: ${storyIdToFetch}), на которую ссылается прохождение, была удалена или не найдена.`
                 throw new Error(errorMsg);
             }
            const originalStory = await storyResponse.json();

            // Отображение данных прохождения
            renderPlaythroughView(playthroughData, originalStory);
            viewPlaythroughDetails.classList.remove('hidden'); // Показываем детали

            // Настройка кнопки скачивания и "Поделиться"
            setupDownloadButton(viewPlaythroughRenderArea, originalStory.title || 'история');
            setupShareButtons(playthroughData, originalStory);

        } catch (error) {
             console.error("Ошибка при загрузке прохождения:", error);
             viewPlaythroughError.textContent = `Не удалось загрузить прохождение: ${error.message}`;
             viewPlaythroughError.style.color = 'red'; // Стиль ошибки
        } finally {
             showLoading(false);
        }
    }

    // Отображение деталей прохождения на экране просмотра.
    function renderPlaythroughView(playthroughData, originalStory) {
        // Экранирование данных перед вставкой в HTML
        const storyTitleEsc = originalStory.title?.replace(/</g, "<") || 'Без названия';
        const readerNickEsc = playthroughData.readerNickname?.replace(/</g, "<") || 'Неизвестный игрок';

        viewPlaythroughStoryTitle.textContent = `Прохождение "${storyTitleEsc}"`;
        viewReaderNickname.textContent = readerNickEsc;
        viewOriginalStoryTitle.textContent = storyTitleEsc;

        // Формирование HTML для отображения пути
        let pathHtml = '<ol><li>Начало</li>'; // Нумерованный список
        if (playthroughData.path && Array.isArray(playthroughData.path)) {
            playthroughData.path.forEach(step => {
                 // Валидация шага
                 if (!Array.isArray(step) || step.length !== 2) {
                      pathHtml += `<li>(Неверный формат шага)</li>`; return;
                 }
                 const [chapId, actIndex] = step;
                 const chapter = originalStory.chapters?.[chapId]; // Поиск главы в данных истории
                 // Поиск действия в главе
                 if (chapter?.actions?.[actIndex]) {
                     // Экранирование текста действия
                     const actionText = chapter.actions[actIndex].text?.replace(/</g, "<") || '(действие)';
                     pathHtml += `<li>${actionText}</li>`;
                 } else {
                     // Если глава или действие отсутствуют (история могла измениться)
                     pathHtml += `<li>(Шаг: Глава ${chapId?.replace(/</g,"<")}, Действие ${actIndex + 1})</li>`;
                 }
             });
        } else {
             pathHtml += '<li>(Путь не записан или пуст)</li>';
        }

        // Добавление информации о финальной главе
        const finalChapterData = playthroughData.finalChapterId ? originalStory.chapters?.[playthroughData.finalChapterId] : null;
        if (finalChapterData?.text) {
            // Экранирование текста финала
            const finalText = finalChapterData.text.replace(/</g, "<");
            pathHtml += `<li><b>Финал:</b> ${finalText}</li>`;
        } else if (playthroughData.finalChapterId) {
            pathHtml += `<li><b>Финал (Достигнута глава ${playthroughData.finalChapterId.replace(/</g,"<")})</b></li>`;
        } else {
            pathHtml += `<li><b>Финал (Неопределенный)</b></li>`;
        }
        pathHtml += '</ol>'; // Закрытие списка
        viewFormattedPath.innerHTML = pathHtml; // Вставка HTML пути

        // Показ кнопки после успешного рендеринга
        downloadImageBtn.classList.remove('hidden');
        shareButtonsContainer.classList.remove('hidden');
    }

    // Настройка кнопки скачивания изображения прохождения.
    function setupDownloadButton(elementToRender, storyTitle) {
        const currentDownloadBtn = document.getElementById('download-image-btn');
        if (!currentDownloadBtn) return; // Кнопка не найдена

        // Клонирование кнопки, чтобы удалить старые обработчики
        const newButton = currentDownloadBtn.cloneNode(true);
        currentDownloadBtn.parentNode.replaceChild(newButton, currentDownloadBtn);

        // Назначение нового обработчика клика
        newButton.onclick = async () => {
            // Проверка наличия библиотеки
            if (typeof htmlToImage === 'undefined') {
                 alert("Ошибка: Библиотека html-to-image не загружена."); return;
             }
            const buttonOriginalText = newButton.textContent;
            newButton.textContent = 'Генерация...'; newButton.disabled = true; showLoading(true);
            try {
                // Гарант того, что элемент видим перед рендерингом
                elementToRender.style.display = 'block';
                await new Promise(resolve => setTimeout(resolve, 100)); // задержка для отрисовки

                // Генерация PNG изображение
                const dataUrl = await htmlToImage.toPng(elementToRender, {
                     backgroundColor: '#ffffff', // Белый фон
                     pixelRatio: Math.max(window.devicePixelRatio || 1, 2), // Увеличивается качество
                     });

                 // Формируется имя файла
                 const filename = `storyforge_playthrough_${storyTitle.replace(/[^a-z0-9_]/gi, '_').toLowerCase()}.png`;
                 // Создается ссылка для скачивания
                 const link = document.createElement('a');
                link.download = filename;
                link.href = dataUrl;
                link.click(); // Инициируется скачивание
                newButton.textContent = buttonOriginalText; // Восстанавливается текст кнопки
            } catch (error) {
                console.error('Ошибка при генерации изображения:', error);
                alert(`Не удалось сгенерировать изображение: ${error.message || error}`);
                newButton.textContent = buttonOriginalText; // Восстанавливается текст при ошибке
            } finally {
                newButton.disabled = false; // Включается кнопку
                showLoading(false);
            }
        };
    }

    // Настройка кнопки "Поделиться" ссылкой на прохождение.
     function setupShareButtons(playthroughData, originalStory) {
         const currentShareContainer = document.querySelector('#view-playthrough-screen .share-buttons');
         if (!currentShareContainer) return; // Контейнер не найден

         // Формирование URL для шаринга (ссылка на текущий сайт + хэш)
         const shareUrl = `${window.location.origin}${window.location.pathname}#view/${playthroughData._id}`;
         // Формирование текста для шаринга (экранирование кавычек в названии)
         const shareTitle = `Я прошел историю "${originalStory.title?.replace(/"/g,"''") || 'Без названия'}" в StoryForge!`;
         const shareText = `${shareTitle} Смотри мой результат:`; // Текст для Telegram

         // Настройка ссылки для Twitter
         const twitterBtn = currentShareContainer.querySelector('.share-twitter');
         if (twitterBtn) {
             twitterBtn.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
         }
         // Настройка ссылки для Telegram
         const telegramBtn = currentShareContainer.querySelector('.share-telegram');
         if (telegramBtn) {
              telegramBtn.href = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
         }
     }


    // --- Функции TTS (Text-to-Speech) ---

    // Заполнение выпадающих списки голосов
     
    function populateVoiceList() {
        if (!synth) return; // Выход, если синтез речи не поддерживается

        try {
            // Получение и сортировка голоса по имени
            voices = synth.getVoices().sort((a, b) => {
                const aname = a.name.toUpperCase();
                const bname = b.name.toUpperCase();
                if (aname < bname) return -1;
                if (aname > bname) return 1;
                return 0;
            });
        } catch (error) {
            console.error("Ошибка получения или сортировки голосов:", error);
            voices = []; // Сброс массива голосов при ошибке
        }

        // Целевые элементы для обновления (читалка и финал)
        const targets = [
             { select: ttsVoiceSelect, playBtn: ttsPlayBtn, status: ttsStatus },
             { select: ttsFinalVoiceSelect, playBtn: ttsFinalPlayBtn, status: ttsFinalStatus }
        ];

        targets.forEach(({ select, playBtn, status }) => {
             if (!select) return; // Пропуск, если элемент select не найден

             // Запоминание имени ранее выбранного голоса (если был)
             const previouslySelectedName = select.options[select.selectedIndex]?.getAttribute('data-name');
             select.innerHTML = ''; // Очистка списка

             // Обработка, если голоса не найдены или произошла ошибка
             if (voices.length === 0) {
                 const option = document.createElement('option');
                 option.textContent = 'Голоса не найдены';
                 option.disabled = true;
                 select.appendChild(option);
                 if(playBtn) playBtn.disabled = true; // Отключения кнопку Play
                 if (status) { status.textContent = 'Нет доступных голосов.'; status.style = ''; }
             } else {
                 // Заполнение списка доступными голосами
                 let newSelectedIndex = 0; // Индекс для выбора по умолчанию
                 voices.forEach((voice, i) => {
                     const option = document.createElement('option');
                     option.textContent = `${voice.name} (${voice.lang})`; // Текст опции
                     option.setAttribute('data-lang', voice.lang); // Сохранение языка
                     option.setAttribute('data-name', voice.name); // Сохранение имени 
                     option.value = i; // Использование индекса как значение
                     select.appendChild(option);
                     // Если имя совпадает с ранее выбранным, запоминается индекс
                     if (voice.name === previouslySelectedName) {
                         newSelectedIndex = i;
                     }
                 });
                 // Восстанавление предыдущего выбора или выбор по умолчанию
                 select.selectedIndex = newSelectedIndex;
                 // Если не было предыдущего выбора, попытка выбрать русский по умолчанию
                 if (newSelectedIndex === 0 && !previouslySelectedName) {
                     let defaultRuIndex = voices.findIndex(v => v.lang.startsWith('ru'));
                     if (defaultRuIndex !== -1) {
                         select.selectedIndex = defaultRuIndex;
                     }
                 }
                 // Включение кнопку Play и очистка статуса
                 if(playBtn) playBtn.disabled = false;
                 if (status) { status.textContent = ''; status.style = ''; }
             }
        });
    }

    // Начинается озвучка текста, используя активные элементы управления TTS.
     
    function startSpeech() {
         // Проверка наличия активных контролов
         if (!activeTTSControls) {
             console.warn("startSpeech: Нет активных контролов TTS.");
             return;
         }

         // Получение элементов из активного конфига
         const { textElement, voiceSelect, playBtn, stopBtn, statusElement } = activeTTSControls;

         // Проверка перед началом озвучки
         if (!synth) {
             statusElement.textContent = 'Синтез речи не поддерживается.'; statusElement.style.color = 'red'; return;
         }
          if (synth.speaking) { // Если уже идет озвучка
             statusElement.textContent = 'Уже идет озвучка...'; statusElement.style = ''; return;
         }
          // Получение и проверка текста для озвучки
          const textToSpeak = textElement?.textContent?.trim();
          if (!textToSpeak) {
              statusElement.textContent = 'Нет текста для озвучки.'; statusElement.style = ''; return;
         }
           // Проверка наличия голосов и выбора в списке
           if (voices.length === 0 || !voiceSelect || voiceSelect.selectedIndex < 0) {
              statusElement.textContent = 'Голос не выбран или недоступен.'; statusElement.style.color = 'red'; return;
         }

         stopSpeech(); // Остановка предыдущей озвучки

         try {
            // Создание объекта озвучки
            currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
            // Получение выбранного голоса
            const selectedVoiceIndex = parseInt(voiceSelect.value, 10);
            if (isNaN(selectedVoiceIndex) || selectedVoiceIndex < 0 || selectedVoiceIndex >= voices.length) {
                throw new Error("Некорректный индекс выбранного голоса.");
            }
            currentUtterance.voice = voices[selectedVoiceIndex];
            currentUtterance.rate = 1; // Скорость по умолчанию
            currentUtterance.pitch = 1; // Тон по умолчанию

            //Обработчики событий для объекта озвучки
            currentUtterance.onstart = () => {
                // При начале озвучки: скрывается Play, показывается Stop, обновление статуса, отключается выбор голоса
                if(playBtn) playBtn.classList.add('hidden');
                if(stopBtn) stopBtn.classList.remove('hidden');
                if(statusElement) { statusElement.textContent = 'Воспроизведение...'; statusElement.style = ''; }
                if(voiceSelect) voiceSelect.disabled = true;
            };
            currentUtterance.onend = () => {
                 // При завершении: показывается Play, скрывается Stop, обновление статуса, включается выбор голоса
                 if(playBtn) playBtn.classList.remove('hidden');
                 if(stopBtn) stopBtn.classList.add('hidden');
                 if(statusElement) { statusElement.textContent = 'Озвучка завершена.'; statusElement.style = ''; }
                 if(voiceSelect) voiceSelect.disabled = false;
                 currentUtterance = null; // Сброс ссылки на объект озвучки
            };
            currentUtterance.onerror = (event) => {
                 // При ошибке: показывается Play, скрывается Stop, показывается ошибку, включается выбор голоса
                 console.error('Ошибка SpeechSynthesis:', event.error, event);
                 if(playBtn) playBtn.classList.remove('hidden');
                 if(stopBtn) stopBtn.classList.add('hidden');
                 if(statusElement) { statusElement.textContent = `Ошибка озвучки: ${event.error}`; statusElement.style.color = 'red'; }
                 if(voiceSelect) voiceSelect.disabled = false;
                 currentUtterance = null;
            };

            //Запуск озвучки 
            if (synth.paused) { synth.resume(); } // Возобновление, если синтезатор был на паузе
            synth.speak(currentUtterance); // Начало озвучку

         } catch(error) {
              // Обработка ошибок при настройке озвучки
              console.error("Ошибка настройки или запуска озвучки:", error);
              if(statusElement) { statusElement.textContent = `Ошибка: ${error.message}`; statusElement.style.color = 'red'; }
              // Сброс UI в исходное состояние при ошибке
              if(playBtn) playBtn.classList.remove('hidden');
              if(stopBtn) stopBtn.classList.add('hidden');
              if(voiceSelect) voiceSelect.disabled = false;
              currentUtterance = null;
         }
    }

    // Принудительно останавливается текущаю озвучка и сбрасывается UI контролы.
    
    function stopSpeech() {
        // Если синтезатор активен (говорит, ожидает, на паузе)
        if (synth && (synth.speaking || synth.pending || synth.paused)) {
            console.log("Остановка синтеза речи.");
            synth.cancel(); // Отменяюся все озвучки в очереди
        }

        // Принудительно сбрасывается UI для ОБОИХ наборов контролов TTS
        const allControls = [
             { select: ttsVoiceSelect, playBtn: ttsPlayBtn, stopBtn: ttsStopBtn, status: ttsStatus },
             { select: ttsFinalVoiceSelect, playBtn: ttsFinalPlayBtn, stopBtn: ttsFinalStopBtn, status: ttsFinalStatus }
        ];

        allControls.forEach(({ select, playBtn, stopBtn, status }) => {
             // Показывается кнопку Play, скрывается Stop, включается выбор, очищается статус
             if(playBtn) playBtn.classList.remove('hidden');
             if(stopBtn) stopBtn.classList.add('hidden');
             if(select) select.disabled = false;
             if (status) { status.textContent = ''; status.style = ''; }
        });

        currentUtterance = null; // Сброс ссылки на текущую озвучку
    }

    // Инициализируются элементы управления TTS для указанного экрана.
    
    function initializeTTS(screenElement) {
         // Проверка поддержки синтеза речи
         if (!synth) {
             console.warn('Web Speech API не поддерживается.');
             // Скрываются контролы TTS на этом экране
             const controls = screenElement?.querySelector('.tts-controls');
             if (controls) controls.classList.add('hidden');
             return;
         }

         let controlsConfig; // Объект для хранения ссылок на элементы текущего экрана
         // Определяется, для какого экрана инициализируется TTS
         if (screenElement === storyReaderScreen && ttsControlsContainer) {
              controlsConfig = {
                  screen: storyReaderScreen, // Ссылка на сам экран
                  container: ttsControlsContainer, // Контейнер контролов
                  textElement: readerChapterText, // Элемент с текстом для озвучки
                  voiceSelect: ttsVoiceSelect, // Выбор голоса
                  playBtn: ttsPlayBtn, // Кнопка Play
                  stopBtn: ttsStopBtn, // Кнопка Stop
                  statusElement: ttsStatus, // Элемент для статуса
                  startHandler: startSpeech // Общая функция для запуска
              };
         } else if (screenElement === finalScreen && ttsFinalControlsContainer) {
              controlsConfig = {
                   screen: finalScreen,
                   container: ttsFinalControlsContainer,
                   textElement: finalMessage, // Текст финала
                   voiceSelect: ttsFinalVoiceSelect,
                   playBtn: ttsFinalPlayBtn,
                   stopBtn: ttsFinalStopBtn,
                   statusElement: ttsFinalStatus,
                   startHandler: startSpeech 
              };
         } else {
              // Если вызвано для неподдерживаемого экрана
              console.warn("initializeTTS вызвана для неподдерживаемого экрана:", screenElement?.id);
              activeTTSControls = null; // Сброс трекера
              return;
         }

          // Проверка наличия контейнера контролов
          if (!controlsConfig.container) {
              console.error("Контейнер TTS не найден для экрана:", screenElement.id);
               activeTTSControls = null; // Сброс трекера
              return;
          }

          // Показываются контролы TTS на активном экране
          controlsConfig.container.classList.remove('hidden');

          // Устанавливается текущий набор контролов как активный
          activeTTSControls = controlsConfig;

          // Заполняется список голосов, если он пуст или список на экране пуст
          if (!voices.length || !controlsConfig.voiceSelect.options.length) {
               populateVoiceList(); // Заполняются оба списка сразу
          }

          // Привязываются обработчики к кнопкам (onclick для перезаписи)
          controlsConfig.playBtn.onclick = controlsConfig.startHandler; // Начать озвучку
          controlsConfig.stopBtn.onclick = stopSpeech; // Остановить озвучку
    }


    //  Обработчики событий 

    // Сохранение никнейма
    saveNicknameBtn.addEventListener('click', () => {
        const nickname = nicknameInput.value.trim();
        if (nickname) {
            currentUserNickname = nickname;
            localStorage.setItem('userNickname', nickname); // Сохранение в localStorage
            welcomeMessage.textContent = `Добро пожаловать, ${currentUserNickname}!`;
            nicknameError.textContent = ''; nicknameError.style = ''; // Убратие ошибку
            loadAndRenderStories(); // Загрузка истории
        } else {
            // Показ ошибки, если ник пустой
            nicknameError.textContent = 'Никнейм не может быть пустым.';
            nicknameError.style.color = 'red'; nicknameError.style.backgroundColor = '#ffebee'; nicknameError.style.border = '1px solid #ef9a9a';
        }
    });

    // Смена никнейма
    changeNicknameBtn.addEventListener('click', () => {
        stopSpeech(); // Остановка озвучки, если была
        localStorage.removeItem('userNickname'); // Удаление ника из хранилища
        currentUserNickname = null; stories = [];
        window.location.hash = ''; // Сброс хэша
        showScreen(nicknameScreen); // Показ экрана ввода ника
    });

    // Переход к созданию новой истории
    createStoryBtn.addEventListener('click', () => {
        stopSpeech(); // Остановка озвучки
        resetEditor(); // Сброс редактора
        showScreen(storyEditorScreen); // Показ экрана редактора
     });

    // Обработчик кнопки "+" для добавления главы 
    if (addChapterInnerBtn) {
        addChapterInnerBtn.addEventListener('click', () => addChapterToEditor());
    }

    // Обработчики кнопок "Назад"
    editorBackBtn.addEventListener('click', () => { stopSpeech(); loadAndRenderStories(); });
    readerBackBtn.addEventListener('click', () => { stopSpeech(); loadAndRenderStories(); });
    finalBackBtn.addEventListener('click', () => { stopSpeech(); loadAndRenderStories(); });
    viewBackBtn.addEventListener('click', () => { stopSpeech(); window.location.hash = ''; }); // Навигация через хэш

    // Сохранение созданной/отредактированной истории
    saveStoryBtn.addEventListener('click', async () => {
        const storyData = buildStoryFromEditor(); // Сбор и валидация данных
        if (storyData) { // Если данные валидны
            editorMessage.textContent = 'Сохранение...'; editorMessage.style.color = 'orange';
            saveStoryBtn.disabled = true; showLoading(true);
            try {
                // Отправка данных на сервер
                const response = await fetch(`${API_BASE_URL}/stories`, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(storyData) });
                if (!response.ok) { // Обработка ошибки сервера
                    let errorMsg = `HTTP ошибка! статус: ${response.status}`;
                    try { const errData = await response.json(); errorMsg = errData.error || errData.message || JSON.stringify(errData); } catch (e) {}
                    throw new Error(errorMsg);
                }
                const savedStory = await response.json(); // Получение сохраненной истории с ID
                editorMessage.textContent = `История "${savedStory.title}" сохранена!`; editorMessage.style.color = 'green';
                // Переход к списку историй через 1.5 секунды
                setTimeout(() => { loadAndRenderStories(); }, 1500);
            } catch (error) {
                // Обработка ошибок сети или валидации на сервере
                console.error('Ошибка сохранения истории:', error);
                editorMessage.textContent = `Ошибка сохранения: ${error.message}`; editorMessage.style.color = 'red';
                saveStoryBtn.disabled = false; // Включить кнопку обратно при ошибке
             } finally {
                 showLoading(false);
             }
        }
     });

    // Сохранение результата прохождения истории
    savePlaythroughBtn.addEventListener('click', async () => {
        // Проверка наличия необходимых данных
        if (!currentStory || !currentUserNickname || !userPath) {
            finalSaveStatus.textContent = 'Ошибка: Недостаточно данных для сохранения.'; finalSaveStatus.style.color = 'red'; return;
        }
        finalSaveStatus.textContent = 'Сохранение...'; finalSaveStatus.style.color = 'orange';
        savePlaythroughBtn.disabled = true; showLoading(true);

        // Определение ID финальной главы (может быть null)
        const finalChapterIdToSend = currentChapterId && currentStory.chapters?.[currentChapterId] ? currentChapterId : null;

        // Формирование данных для отправки
        const playthroughData = {
             storyId: currentStory._id,
             readerNickname: currentUserNickname,
             path: userPath,
             finalChapterId: finalChapterIdToSend
        };

        try {
            // Отправление данных на сервер
            const response = await fetch(`${API_BASE_URL}/playthroughs`, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(playthroughData) });
            if (!response.ok) { // Обработка ошибки сервера
                let errorMsg = `HTTP ошибка! статус: ${response.status}`;
                try { const errData = await response.json(); errorMsg = errData.error || errData.message || JSON.stringify(errData); } catch (e) {}
                throw new Error(errorMsg);
            }
            const savedPlaythrough = await response.json(); // Получение сохраненного прохождения с ID

            // Формирование URL для просмотра/шаринга
            const shareUrl = `${window.location.origin}${window.location.pathname}#view/${savedPlaythrough._id}`;
            // Отображение сообщения об успехе со ссылкой и кнопкой копирования
            finalSaveStatus.innerHTML = `
                Прохождение успешно сохранено!<br>
                <a href="#view/${savedPlaythrough._id}" class="playthrough-link">Посмотреть результат</a>
                <button class="copy-link-btn" data-url="${shareUrl}">Копировать ссылку</button>
            `;
            finalSaveStatus.style.color = 'green'; 

            // Добавление обработчика для новой кнопки копирования
            const copyBtn = finalSaveStatus.querySelector('.copy-link-btn');
            if (copyBtn) {
                copyBtn.onclick = (e) => {
                    const urlToCopy = e.target.dataset.url;
                    navigator.clipboard.writeText(urlToCopy).then(() => {                       
                        e.target.textContent = 'Скопировано!';
                        setTimeout(() => { e.target.textContent = 'Копировать ссылку'; }, 1500); // Вернуть текст кнопки
                    }).catch(err => {
                        console.error('Ошибка копирования: ', err);
                        alert('Не удалось скопировать ссылку.');
                    });
                };
            }
             // Ссылку "Посмотреть результат" обрабатывает hashchange

        } catch (error) {
            // Обработка ошибок сети или сервера
            console.error('Ошибка сохранения прохождения:', error);
            finalSaveStatus.textContent = `Ошибка сохранения: ${error.message}`; finalSaveStatus.style.color = 'red';
            savePlaythroughBtn.disabled = false; // Включить кнопку обратно при ошибке
        } finally {
            showLoading(false);
             // Оставить кнопку сохранения отключенной после успешного сохранения
        }
    });

    // Слушатель изменения хэша URL 
    window.addEventListener('hashchange', handleHashChange); // Вызыв handleHashChange, который останавливает TTS

    // Инициализация приложения при загрузке страницы 
    function initializeApp() {
        const storedNickname = localStorage.getItem('userNickname'); // Проверка наличия ника
        console.log("Инициализация: Сохраненный ник:", storedNickname);

        // Проверка поддержки TTS API
        if (!('speechSynthesis' in window)) {
             console.warn('Web Speech API (Синтез речи) не поддерживается этим браузером.');
        } else {
            // Назначение обработчика изменения голосов /для асинхронной загрузки/
             if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = populateVoiceList;
            }
            // Попытка загрузить голоса 
            populateVoiceList();
        }

        // Определение начального экрана
        if (storedNickname) { // Если ник есть
            currentUserNickname = storedNickname;
            welcomeMessage.textContent = `С возвращением, ${currentUserNickname}!`;
            handleHashChange(); // Определение экрана по хэшу (или показ списка)
        } else { // Если ника нет
             console.log("Инициализация: Ник не найден. Показ экрана ввода.");
             showScreen(nicknameScreen); // Показ экрана ввода ника
        }
    }

    // Запуск инициализации приложения
    initializeApp();

}); 
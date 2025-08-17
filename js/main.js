(function() {
'use strict';

// 전역 변수
let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let isRepeating = false;

// 구간 정보
let startTime = 0;    // 마지막 시작 시점
let pauseTime = 0;    // 마지막 일시정지 시점

// DOM 요소들
let audioFile, uploadArea, fileInfo, fileName, removeFile, playerSection, audioPlayer;
let playBtn, pauseBtn, repeatBtn;
let progressBar, progressFill, progressHandle, currentTime, totalTime;
let speedSlider, speedValue, speedPresets;
let sectionInfo, sectionStart, sectionEnd, sectionDuration;
let statusIndicator, statusText;

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('앱 초기화 시작');
    initializeApp();
});

function initializeApp() {
    // DOM 요소들 가져오기
    audioFile = document.getElementById('audioFile');
    uploadArea = document.getElementById('uploadArea');
    fileInfo = document.getElementById('fileInfo');
    fileName = document.getElementById('fileName');
    removeFile = document.getElementById('removeFile');
    playerSection = document.getElementById('playerSection');
    audioPlayer = document.getElementById('audioPlayer');

    // 컨트롤 버튼들
    playBtn = document.getElementById('playBtn');
    pauseBtn = document.getElementById('pauseBtn');
    repeatBtn = document.getElementById('repeatBtn');

    // 진행바 관련
    progressBar = document.getElementById('progressBar');
    progressFill = document.getElementById('progressFill');
    progressHandle = document.getElementById('progressHandle');
    currentTime = document.getElementById('currentTime');
    totalTime = document.getElementById('totalTime');

    // 재생 속도 관련
    speedSlider = document.getElementById('speedSlider');
    speedValue = document.getElementById('speedValue');
    speedPresets = document.querySelectorAll('.speed-preset');

    // 구간 정보 표시
    sectionInfo = document.getElementById('sectionInfo');
    sectionStart = document.getElementById('sectionStart');
    sectionEnd = document.getElementById('sectionEnd');
    sectionDuration = document.getElementById('sectionDuration');

    // 상태 표시
    statusIndicator = document.getElementById('statusIndicator');
    statusText = document.getElementById('statusText');

    setupEventListeners();
    updateStatus('파일을 업로드하여 시작하세요');
    console.log('앱 초기화 완료');
}

function setupEventListeners() {
    // 파일 업로드 관련
    audioFile.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('click', () => audioFile.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('drop', handleFileDrop);
    removeFile.addEventListener('click', removeAudioFile);

    // 컨트롤 버튼들
    playBtn.addEventListener('click', handlePlay);
    pauseBtn.addEventListener('click', handlePause);
    repeatBtn.addEventListener('click', handleRepeat);

    // 진행바 클릭
    progressBar.addEventListener('click', handleProgressBarClick);

    // 재생 속도 조절
    speedSlider.addEventListener('input', handleSpeedChange);
    speedPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const speed = parseFloat(preset.dataset.speed);
            setPlaybackSpeed(speed);
        });
    });

    // 키보드 단축키
    document.addEventListener('keydown', handleKeyDown);

    // 드래그 이벤트 정리
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', (e) => e.preventDefault());

    uploadArea.addEventListener('dragleave', (e) => {
        if (!uploadArea.contains(e.relatedTarget)) {
            uploadArea.classList.remove('dragover');
        }
    });
}

// 파일 선택 처리
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('파일 선택됨:', file.name);
        loadAudioFile(file);
    }
}

// 드래그 앤 드롭 처리
function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleFileDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
        console.log('파일 드롭됨:', file.name);
        loadAudioFile(file);
    }
}

// 오디오 파일 로드
function loadAudioFile(file) {
    const url = URL.createObjectURL(file);
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    currentAudio = new Audio(url);
    audioPlayer.src = url;
    
    fileName.textContent = file.name;
    uploadArea.style.display = 'none';
    fileInfo.style.display = 'flex';
    playerSection.style.display = 'block';
    
    // 오디오 이벤트 리스너 설정
    currentAudio.addEventListener('loadedmetadata', handleAudioLoaded);
    currentAudio.addEventListener('timeupdate', handleTimeUpdate);
    currentAudio.addEventListener('ended', handleAudioEnded);
    
    enableControls();
    updateStatus('파일이 로드되었습니다. 시작 버튼을 눌러주세요.');
    console.log('오디오 파일 로드 완료');
}

// 오디오 로드 완료
function handleAudioLoaded() {
    totalTime.textContent = formatTime(currentAudio.duration);
    updateProgress();
    console.log('오디오 메타데이터 로드됨');
}

// 시간 업데이트
function handleTimeUpdate() {
    updateProgress();
    updateTimeDisplay();
    
    // 반복 재생 중 종료점 체크
    if (isRepeating && currentAudio.currentTime >= pauseTime) {
        handleRepeatEnd();
    }
}

// 재생 버튼 클릭
function handlePlay() {
    if (!currentAudio) return;
    
    if (isPaused) {
        // 일시정지에서 재개 - 새로운 시작점 설정
        startTime = currentAudio.currentTime;
        isPaused = false;
        console.log('재개 - 새 시작점:', formatTime(startTime));
    } else {
        // 처음 시작
        startTime = currentAudio.currentTime;
        console.log('재생 시작 - 시작점:', formatTime(startTime));
    }
    
    currentAudio.play();
    isPlaying = true;
    
    updateButtonStates();
    updateStatus('재생 중');
    updateSectionInfo();
}

// 일시정지 버튼 클릭
function handlePause() {
    if (!currentAudio || !isPlaying) return;
    
    pauseTime = currentAudio.currentTime;
    currentAudio.pause();
    isPlaying = false;
    isPaused = true;
    
    console.log('일시정지 - 끝점:', formatTime(pauseTime));
    
    updateButtonStates();
    updateStatus('일시정지');
    updateSectionInfo();
}

// 반복 버튼 클릭
function handleRepeat() {
    if (!currentAudio || !isPaused || startTime === pauseTime) return;
    
    console.log('구간 반복:', formatTime(startTime), '~', formatTime(pauseTime));
    
    // 반복 구간 재생 시작
    isRepeating = true;
    currentAudio.currentTime = startTime;
    currentAudio.play();
    isPlaying = true;
    isPaused = false;
    
    updateButtonStates();
    updateStatus('구간 반복 중');
    updateSectionInfo();
}

// 반복 재생 종료
function handleRepeatEnd() {
    currentAudio.pause();
    currentAudio.currentTime = pauseTime;
    isRepeating = false;
    isPlaying = false;
    isPaused = true;
    
    console.log('구간 반복 완료');
    
    updateButtonStates();
    updateStatus('구간 반복 완료 - 일시정지');
}

// 오디오 재생 종료
function handleAudioEnded() {
    isPlaying = false;
    isPaused = false;
    isRepeating = false;
    
    updateButtonStates();
    updateStatus('재생 완료');
    console.log('재생 완료');
}

// 버튼 상태 업데이트
function updateButtonStates() {
    // 모든 버튼 active 클래스 제거
    playBtn.classList.remove('active');
    pauseBtn.classList.remove('active');
    repeatBtn.classList.remove('active');
    
    // 현재 상태에 따라 active 클래스 추가
    if (isPlaying) {
        if (isRepeating) {
            repeatBtn.classList.add('active');
        } else {
            playBtn.classList.add('active');
        }
    } else if (isPaused) {
        pauseBtn.classList.add('active');
    }
    
    // 버튼 활성화/비활성화
    playBtn.disabled = false;
    pauseBtn.disabled = !isPlaying;
    repeatBtn.disabled = !isPaused || startTime === pauseTime;
}

// 상태 표시 업데이트
function updateStatus(message) {
    statusText.textContent = message;
    
    // 상태에 따른 스타일 변경
    statusIndicator.className = 'status-indicator';
    if (isPlaying) {
        if (isRepeating) {
            statusIndicator.classList.add('repeating');
        } else {
            statusIndicator.classList.add('playing');
        }
    } else if (isPaused) {
        statusIndicator.classList.add('paused');
    }
}

// 구간 정보 업데이트
function updateSectionInfo() {
    if (isPaused && startTime !== pauseTime) {
        sectionInfo.style.display = 'block';
        sectionStart.textContent = formatTime(startTime);
        sectionEnd.textContent = formatTime(pauseTime);
        
        const duration = pauseTime - startTime;
        sectionDuration.textContent = `${Math.round(duration)}초`;
    } else {
        sectionInfo.style.display = 'none';
    }
}

// 진행바 업데이트
function updateProgress() {
    if (!currentAudio) return;
    
    const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
    progressFill.style.width = `${percent}%`;
    progressHandle.style.left = `${percent}%`;
}

// 시간 표시 업데이트
function updateTimeDisplay() {
    if (!currentAudio) return;
    currentTime.textContent = formatTime(currentAudio.currentTime);
}

// 진행바 클릭 처리
function handleProgressBarClick(event) {
    if (!currentAudio) return;
    
    const rect = progressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    const newTime = percent * currentAudio.duration;
    
    currentAudio.currentTime = newTime;
    
    // 재생 중이었다면 새로운 시작점 설정
    if (isPlaying && !isRepeating) {
        startTime = newTime;
        console.log('진행바 클릭 - 새 시작점:', formatTime(startTime));
    }
}

// 재생 속도 변경
function handleSpeedChange() {
    const speed = parseFloat(speedSlider.value);
    setPlaybackSpeed(speed);
}

function setPlaybackSpeed(speed) {
    if (!currentAudio) return;
    
    currentAudio.playbackRate = speed;
    speedSlider.value = speed;
    speedValue.textContent = `${speed}x`;
    
    // 프리셋 버튼 상태 업데이트
    speedPresets.forEach(preset => {
        preset.classList.toggle('active', parseFloat(preset.dataset.speed) === speed);
    });
    
    console.log('재생 속도 변경:', speed + 'x');
}

// 키보드 단축키
function handleKeyDown(event) {
    if (!currentAudio) return;
    
    switch (event.code) {
        case 'Space':
            event.preventDefault();
            if (isPlaying) {
                handlePause();
            } else {
                handlePlay();
            }
            break;
        case 'KeyR':
            event.preventDefault();
            if (!repeatBtn.disabled) {
                handleRepeat();
            }
            break;
        case 'ArrowLeft':
            event.preventDefault();
            currentAudio.currentTime = Math.max(0, currentAudio.currentTime - 5);
            break;
        case 'ArrowRight':
            event.preventDefault();
            currentAudio.currentTime = Math.min(currentAudio.duration, currentAudio.currentTime + 5);
            break;
    }
}

// 컨트롤 활성화
function enableControls() {
    playBtn.disabled = false;
    pauseBtn.disabled = false;
    repeatBtn.disabled = false;
}

// 파일 제거
function removeAudioFile() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    audioFile.value = '';
    uploadArea.style.display = 'block';
    fileInfo.style.display = 'none';
    playerSection.style.display = 'none';
    
    // 상태 초기화
    isPlaying = false;
    isPaused = false;
    isRepeating = false;
    startTime = 0;
    pauseTime = 0;
    
    updateStatus('파일을 업로드하여 시작하세요');
    console.log('파일 제거됨');
}

// 시간 포맷 함수
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

})();
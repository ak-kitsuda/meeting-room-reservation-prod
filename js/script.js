document.addEventListener('DOMContentLoaded', function() {
    // ローカルストレージから予約データを読み込む
    let reservations = JSON.parse(localStorage.getItem('reservations')) || [];
    
    // 会議室画像のクリックイベント
    const roomImages = document.querySelectorAll('.room-image');
    const roomSelect = document.getElementById('room');
    
    roomImages.forEach(image => {
        image.addEventListener('click', function() {
            // 選択状態のリセット
            roomImages.forEach(img => img.classList.remove('selected'));
            
            // クリックした画像を選択状態に
            this.classList.add('selected');
            
            // フォームのセレクトボックスを更新
            const room = this.getAttribute('data-room');
            roomSelect.value = room;
        });
    });
    
    // 予約フォームの送信イベント
    const reservationForm = document.getElementById('reservation-form');
    reservationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // フォームデータの取得
        const room = document.getElementById('room').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const reserverName = document.getElementById('reserver-name').value;
        
        // 入力チェック
        if (!room || !startTime || !endTime || !reserverName) {
            alert('すべての項目を入力してください。');
            return;
        }
        
        // 時間が有効かチェック
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        
        if (startDate >= endDate) {
            alert('終了時間は開始時間より後にしてください。');
            return;
        }
        
        // 予約の重複チェック
        const conflictingReservation = checkConflict(room, startDate, endDate);
        if (conflictingReservation) {
            alert(`予約の時間が重複しています。\n${formatDate(conflictingReservation.startTime)}～${formatDate(conflictingReservation.endTime)}は既に予約されています。`);
            return;
        }
        
        // 予約データの作成
        const newReservation = {
            id: Date.now(), // 一意のID
            room: room,
            startTime: startTime,
            endTime: endTime,
            reserverName: reserverName,
            createdAt: new Date().toISOString()
        };
        
        // 予約リストに追加
        reservations.push(newReservation);
        
        // ローカルストレージに保存
        localStorage.setItem('reservations', JSON.stringify(reservations));
        
        // フォームをリセット
        reservationForm.reset();
        roomImages.forEach(img => img.classList.remove('selected'));
        
        // 予約一覧を更新
        displayReservations();
        
        alert('予約が完了しました！');
    });
    
    // CSVダウンロードボタン
    const downloadCsvBtn = document.getElementById('download-csv');
    downloadCsvBtn.addEventListener('click', function() {
        downloadReservationsAsCsv();
    });
    
    // 初期表示時に予約一覧を表示
    displayReservations();
    
    // 予約の重複チェック関数
    function checkConflict(room, newStart, newEnd) {
        for (let reservation of reservations) {
            if (reservation.room === room) {
                const existingStart = new Date(reservation.startTime);
                const existingEnd = new Date(reservation.endTime);
                
                // 時間の重複チェック
                if ((newStart < existingEnd && newEnd > existingStart)) {
                    return reservation;
                }
            }
        }
        return null;
    }
    
    // 予約一覧表示関数
    function displayReservations() {
        const reservationsList = document.getElementById('reservations-list');
        reservationsList.innerHTML = '';
        
        // 日付でソート
        const sortedReservations = [...reservations].sort((a, b) => {
            return new Date(a.startTime) - new Date(b.startTime);
        });
        
        if (sortedReservations.length === 0) {
            reservationsList.innerHTML = '<p>予約はありません。</p>';
            return;
        }
        
        // 会議室ごとにグループ化
        const roomA = sortedReservations.filter(r => r.room === 'A');
        const roomB = sortedReservations.filter(r => r.room === 'B');
        
        // 会議室Aの予約を表示
        if (roomA.length > 0) {
            const roomAHeader = document.createElement('h3');
            roomAHeader.textContent = '会議室A';
            reservationsList.appendChild(roomAHeader);
            
            roomA.forEach(reservation => {
                addReservationItem(reservation, reservationsList);
            });
        }
        
        // 会議室Bの予約を表示
        if (roomB.length > 0) {
            const roomBHeader = document.createElement('h3');
            roomBHeader.textContent = '会議室B';
            reservationsList.appendChild(roomBHeader);
            
            roomB.forEach(reservation => {
                addReservationItem(reservation, reservationsList);
            });
        }
    }
    
    // 予約アイテムを作成して追加
    function addReservationItem(reservation, container) {
        const item = document.createElement('div');
        item.className = 'reservation-item';
        
        const startTime = new Date(reservation.startTime);
        const endTime = new Date(reservation.endTime);
        
        item.innerHTML = `
            <p><strong>予約者:</strong> ${reservation.reserverName}</p>
            <p><strong>利用開始:</strong> ${formatDate(startTime)}</p>
            <p><strong>利用終了:</strong> ${formatDate(endTime)}</p>
            <button class="delete-btn" data-id="${reservation.id}">キャンセル</button>
        `;
        
        // キャンセルボタンの処理
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            if (confirm('この予約をキャンセルしますか？')) {
                const reservationId = parseInt(this.getAttribute('data-id'));
                deleteReservation(reservationId);
            }
        });
        
        container.appendChild(item);
    }
    
    // 日付フォーマット関数
    function formatDate(date) {
        const options = { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit'
        };
        return date.toLocaleString('ja-JP', options);
    }
    
    // 予約削除関数
    function deleteReservation(id) {
        reservations = reservations.filter(reservation => reservation.id !== id);
        localStorage.setItem('reservations', JSON.stringify(reservations));
        displayReservations();
    }
    
    // CSVダウンロード関数
    function downloadReservationsAsCsv() {
        if (reservations.length === 0) {
            alert('予約データがありません。');
            return;
        }
        
        // CSVヘッダー
        let csvContent = '会議室,利用開始日時,利用終了日時,予約者名,予約日時\n';
        
        // 各予約をCSV行に変換
        reservations.forEach(reservation => {
            const startTime = new Date(reservation.startTime);
            const endTime = new Date(reservation.endTime);
            const createdAt = new Date(reservation.createdAt);
            
            const row = [
                `会議室${reservation.room}`,
                formatDateForCsv(startTime),
                formatDateForCsv(endTime),
                reservation.reserverName,
                formatDateForCsv(createdAt)
            ].join(',');
            
            csvContent += row + '\n';
        });
        
        // CSVファイルの作成とダウンロード
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // 現在の日時をファイル名に使用
        const now = new Date();
        const fileName = `reservations_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // CSV用日付フォーマット関数
    function formatDateForCsv(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    }
}); 
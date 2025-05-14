document.addEventListener('DOMContentLoaded', function() {
    // ローカルストレージから予約データを読み込む
    let reservations = JSON.parse(localStorage.getItem('reservations')) || [];
    
    // 現在の絞り込み条件
    let currentFilter = 'all';
    
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
    
    // 開始時間が変更されたら終了時間の選択肢を制限
    const startTimeSelect = document.getElementById('start-time');
    const endTimeSelect = document.getElementById('end-time');
    
    startTimeSelect.addEventListener('change', function() {
        const selectedStartTime = this.value;
        
        if (!selectedStartTime) {
            return;
        }
        
        // 終了時間のすべてのオプションを取得
        const endTimeOptions = endTimeSelect.querySelectorAll('option');
        
        // 選択された開始時間より前の終了時間オプションを無効化
        endTimeOptions.forEach(option => {
            if (option.value === "") return; // 「選択してください」オプションはスキップ
            
            if (option.value <= selectedStartTime) {
                option.disabled = true;
                // 無効化されたオプションが選択されていた場合、選択を解除
                if (endTimeSelect.value === option.value) {
                    endTimeSelect.value = "";
                }
            } else {
                option.disabled = false;
            }
        });
    });
    
    // 予約フォームの送信イベント
    const reservationForm = document.getElementById('reservation-form');
    reservationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // フォームデータの取得
        const room = document.getElementById('room').value;
        const reservationDate = document.getElementById('reservation-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const reserverName = document.getElementById('reserver-name').value;
        
        // 入力チェック
        if (!room || !reservationDate || !startTime || !endTime || !reserverName) {
            alert('すべての項目を入力してください。');
            return;
        }
        
        // 日付と時間を組み合わせてDateオブジェクトを作成
        const startDateTime = `${reservationDate}T${startTime}:00`;
        const endDateTime = `${reservationDate}T${endTime}:00`;
        
        const startDate = new Date(startDateTime);
        const endDate = new Date(endDateTime);
        
        // 時間が有効かチェック
        if (startDate >= endDate) {
            alert('終了時間は開始時間より後にしてください。');
            return;
        }
        
        // 予約の重複チェック
        const conflictingReservation = check_conflict(room, startDate, endDate);
        if (conflictingReservation) {
            alert(`予約の時間が重複しています。\n${format_date(new Date(conflictingReservation.startTime))}～${format_date(new Date(conflictingReservation.endTime))}は既に予約されています。`);
            return;
        }
        
        // 予約データの作成
        const newReservation = {
            id: Date.now(), // 一意のID
            room: room,
            startTime: startDateTime,
            endTime: endDateTime,
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
        display_reservations();
        
        alert('予約が完了しました！');
    });
    
    // CSVダウンロードボタン
    const downloadCsvBtn = document.getElementById('download-csv');
    downloadCsvBtn.addEventListener('click', function() {
        download_reservations_as_csv();
    });
    
    // 絞り込み機能
    const filterRoomSelect = document.getElementById('filter-room');
    filterRoomSelect.addEventListener('change', function() {
        currentFilter = this.value;
        display_reservations();
    });
    
    // 初期表示時に予約一覧を表示
    display_reservations();
    
    // 予約の重複チェック関数
    function check_conflict(room, newStart, newEnd) {
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
    function display_reservations() {
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
        
        // 絞り込み条件が「すべて」以外なら、その会議室だけを表示
        if (currentFilter !== 'all') {
            const filteredReservations = sortedReservations.filter(r => r.room === currentFilter);
            
            if (filteredReservations.length === 0) {
                reservationsList.innerHTML = `<p>会議室${currentFilter}の予約はありません。</p>`;
                return;
            }
            
            // 会議室ヘッダーの追加
            const roomHeader = document.createElement('h3');
            roomHeader.textContent = `会議室${currentFilter}`;
            roomHeader.className = `room-header room-${currentFilter.toLowerCase()}`;
            reservationsList.appendChild(roomHeader);
            
            // 予約アイテムの追加
            filteredReservations.forEach(reservation => {
                add_reservation_item(reservation, reservationsList);
            });
            
            return;
        }
        
        // 会議室ごとにグループ化
        const roomA = sortedReservations.filter(r => r.room === 'A');
        const roomB = sortedReservations.filter(r => r.room === 'B');
        const roomC = sortedReservations.filter(r => r.room === 'C');
        
        // 会議室Aの予約を表示
        if (roomA.length > 0) {
            const roomAHeader = document.createElement('h3');
            roomAHeader.textContent = '会議室A';
            roomAHeader.className = 'room-header room-a';
            reservationsList.appendChild(roomAHeader);
            
            roomA.forEach(reservation => {
                add_reservation_item(reservation, reservationsList);
            });
        }
        
        // 会議室Bの予約を表示
        if (roomB.length > 0) {
            const roomBHeader = document.createElement('h3');
            roomBHeader.textContent = '会議室B';
            roomBHeader.className = 'room-header room-b';
            reservationsList.appendChild(roomBHeader);
            
            roomB.forEach(reservation => {
                add_reservation_item(reservation, reservationsList);
            });
        }
        
        // 会議室Cの予約を表示
        if (roomC.length > 0) {
            const roomCHeader = document.createElement('h3');
            roomCHeader.textContent = '会議室C';
            roomCHeader.className = 'room-header room-c';
            reservationsList.appendChild(roomCHeader);
            
            roomC.forEach(reservation => {
                add_reservation_item(reservation, reservationsList);
            });
        }
    }
    
    // 予約アイテムを作成して追加
    function add_reservation_item(reservation, container) {
        const item = document.createElement('div');
        item.className = 'reservation-item';
        
        const startTime = new Date(reservation.startTime);
        const endTime = new Date(reservation.endTime);
        
        item.innerHTML = `
            <p><strong>予約者:</strong> ${reservation.reserverName}</p>
            <p><strong>利用開始:</strong> ${format_date(startTime)}</p>
            <p><strong>利用終了:</strong> ${format_date(endTime)}</p>
            <button class="delete-btn" data-id="${reservation.id}">キャンセル</button>
        `;
        
        // キャンセルボタンの処理
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            if (confirm('この予約をキャンセルしますか？')) {
                const reservationId = parseInt(this.getAttribute('data-id'));
                delete_reservation(reservationId);
            }
        });
        
        container.appendChild(item);
    }
    
    // 日付フォーマット関数
    function format_date(date) {
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
    function delete_reservation(id) {
        reservations = reservations.filter(reservation => reservation.id !== id);
        localStorage.setItem('reservations', JSON.stringify(reservations));
        display_reservations();
    }
    
    // CSVダウンロード関数
    function download_reservations_as_csv() {
        if (reservations.length === 0) {
            alert('予約データがありません。');
            return;
        }
        
        // 絞り込みが適用されている場合は、その会議室のみをCSVに含める
        let reservationsToExport = reservations;
        if (currentFilter !== 'all') {
            reservationsToExport = reservations.filter(r => r.room === currentFilter);
            if (reservationsToExport.length === 0) {
                alert(`会議室${currentFilter}の予約データがありません。`);
                return;
            }
        }
        
        // CSVヘッダー
        let csvContent = '会議室,利用開始日時,利用終了日時,予約者名,予約日時\n';
        
        // 各予約をCSV行に変換
        reservationsToExport.forEach(reservation => {
            const startTime = new Date(reservation.startTime);
            const endTime = new Date(reservation.endTime);
            const createdAt = new Date(reservation.createdAt);
            
            const row = [
                `会議室${reservation.room}`,
                format_date_for_csv(startTime),
                format_date_for_csv(endTime),
                reservation.reserverName,
                format_date_for_csv(createdAt)
            ].join(',');
            
            csvContent += row + '\n';
        });
        
        // CSVファイルの作成とダウンロード
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // 現在の日時をファイル名に使用
        const now = new Date();
        let fileName = `reservations_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
        
        // 絞り込みが適用されている場合は、会議室名をファイル名に追加
        if (currentFilter !== 'all') {
            fileName += `_room${currentFilter}`;
        }
        
        fileName += '.csv';
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // CSV用日付フォーマット関数
    function format_date_for_csv(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    }
}); 
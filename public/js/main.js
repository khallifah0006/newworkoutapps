document.addEventListener('DOMContentLoaded', function() {
  const healthInfoSection = document.getElementById('healthInfoSection');
  const calculatorSection = document.getElementById('calculatorSection');
  const resultsSection = document.getElementById('resultsSection');
  const myProgramSection = document.getElementById('myProgramSection');
  const testimonialSection = document.getElementById('testimonialSection');
  const startTestBtn = document.getElementById('startTestBtn');
  const backToHealthBtn = document.getElementById('backToHealthBtn');
  const backToCalculatorBtn = document.getElementById('backToCalculatorBtn');
  const viewProgramBtn = document.getElementById('viewProgramBtn');
  const viewTestimonialsBtn = document.getElementById('viewTestimonialsBtn');
  const backToProgramBtn = document.getElementById('backToProgramBtn');
  const backTomainmenu = document.getElementById('backTomainmenu');
  const workoutForm = document.getElementById('workoutForm');
  const loadingDiv = document.getElementById('loading');
  const resultsDiv = document.getElementById('results');
  const recommendBtn = document.getElementById('recommendBtn');
  const recommendationsDiv = document.getElementById('recommendations');
  const workoutTypeSelect = document.getElementById('workoutType');
  const difficultyLevelSelect = document.getElementById('difficultyLevel');
  const selectedWorkoutsDiv = document.getElementById('selectedWorkouts');
  const backtorecomendation = document.getElementById('backtorecomendation');

  const programStatusDiv = document.createElement('div');
  programStatusDiv.id = 'programStatus';
  programStatusDiv.className = 'program-status';
  myProgramSection.querySelector('.container').insertBefore(
    programStatusDiv, 
    myProgramSection.querySelector('.container').firstChild.nextSibling
  );
 
  let selectedWorkouts = [];
  let currentRecommendations = []; // Added missing variable

  initializeApp();

  function initializeApp() {
    // Initialize your app here
    selectedWorkouts = [];
    updateSelectedWorkoutsView();
    updateViewProgramButton();
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }

  // Function to show a specific slide and hide others
  function showSlide(slideToShow) {
    // Hide all slides
    healthInfoSection.classList.add('hidden');
    calculatorSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    myProgramSection.classList.add('hidden');
    testimonialSection.classList.add('hidden');
    
    // Show the requested slide
    slideToShow.classList.remove('hidden');
  }
  
  // Event listener for "Ikuti Test" button
  startTestBtn.addEventListener('click', function() {
    showSlide(calculatorSection);
  });
  
  // Event listener for back button to health info
  backToHealthBtn.addEventListener('click', function() {
    showSlide(healthInfoSection);
  });
  
  // Event listener for back button to calculator
  backToCalculatorBtn.addEventListener('click', function() {
    showSlide(calculatorSection);
  });
  
  // Event listener for "View Testimonials" button
  viewTestimonialsBtn.addEventListener('click', function() {
    showSlide(testimonialSection);
  });
  
  // Event listener for back button to program
  backToProgramBtn.addEventListener('click', function() {
    showSlide(myProgramSection);
  });

  backtorecomendation.addEventListener('click', function() {
    showSlide(resultsSection);
  });

  backTomainmenu.addEventListener('click', function() {
    showSlide(healthInfoSection);
    initializeApp(); 
  });

  workoutForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form values
    const age = document.getElementById('age').value;
    const height = document.getElementById('height').value;
    const weight = document.getElementById('weight').value;
    
    // Basic validation
    if (!age || !height || !weight) {
      showNotification('Silakan isi semua field.', 'error');
      return;
    }
    
    // Show loading, hide form
    workoutForm.closest('.form-container').classList.add('hidden');
    loadingDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    
    // Send data to server
    fetchRecommendations(age, height, weight);
  });
  
  async function fetchRecommendations(age, height, weight) {
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          age: parseFloat(age),
          height: parseFloat(height),
          weight: parseFloat(weight)
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      displayResults(data);
      
      // Show results section after successful fetch
      showSlide(resultsSection);
      
    } catch (error) {
      console.error('Error:', error);
      showNotification('Terjadi kesalahan saat mengambil rekomendasi. Silakan coba lagi.', 'error');
      
      // Show form again
      workoutForm.closest('.form-container').classList.remove('hidden');
      loadingDiv.classList.add('hidden');
    }
  }
  
  function displayResults(data) {
    loadingDiv.classList.add('hidden');
    resultsDiv.classList.remove('hidden');
    document.getElementById('bmi-value').textContent = data.bmi.toFixed(2);
    document.getElementById('bmi-category').textContent = data.bmi_category;
    document.getElementById('age-category').textContent = data.age_category;
    document.getElementById('difficulty-level').textContent = data.difficulty_level;
    const workoutSummary = document.getElementById('workout-summary');
    workoutSummary.innerHTML = data.summary;
    const enduranceWorkouts = document.getElementById('endurance-workouts');
    enduranceWorkouts.innerHTML = '';
    data.endurance_workouts.forEach((workout, index) => {
      const workoutCard = createWorkoutCard(workout, index + 1);
      enduranceWorkouts.appendChild(workoutCard);
    });
    const strengthWorkouts = document.getElementById('strength-workouts');
    strengthWorkouts.innerHTML = '';
    
    data.strength_workouts.forEach((workout, index) => {
      const workoutCard = createWorkoutCard(workout, index + 1);
      strengthWorkouts.appendChild(workoutCard);
    });
  }
  
  function createWorkoutCard(workout, index) {
    const card = document.createElement('div');
    card.className = 'workout-card';
    
    card.innerHTML = `
      <div class="workout-title">${index}. ${workout.name}</div>
      <div class="workout-detail">
        <span class="label">Kesulitan:</span>
        <span class="value ${workout.kesulitan}">${workout.kesulitan}</span>
      </div>
      <div class="workout-detail">
        <span class="label">Target:</span>
        <span class="value">${workout.target}</span>
      </div>
      <div class="workout-detail">
        <span class="label">Deskripsi:</span>
        <span class="value">${workout.description}</span>
      </div>
    `;
    
    return card;
  }
  
  function addOption(selectElement, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    selectElement.appendChild(option);
  }
  
  function updateSelectedWorkoutsView() {
    if (selectedWorkouts.length === 0) {
      selectedWorkoutsDiv.innerHTML = '<p class="empty-message">Belum ada gerakan yang dipilih. Tambahkan gerakan dengan klik tombol (+).</p>';
      return;
    }
    
    let html = '';
    selectedWorkouts.forEach((workout, index) => {
      let difficultyClass = '';
      if (workout.kesulitan === 'Easy') difficultyClass = 'difficulty-easy';
      else if (workout.kesulitan === 'Medium') difficultyClass = 'difficulty-medium';
      else if (workout.kesulitan === 'Hard' || workout.kesulitan === 'Very Hard') difficultyClass = 'difficulty-hard';
      
      html += `
        <div class="workout-card selected-workout" data-index="${index}">
          <div class="workout-name">${workout.name}</div>
          <div class="workout-detail"><strong>Jenis:</strong> ${workout.jenis}</div>
          <div class="workout-detail"><strong>Subkategori:</strong> ${workout.subkategori || 'N/A'}</div>
          <div class="workout-detail"><strong>Target:</strong> ${workout.target}</div>
          <div class="workout-detail"><strong>Kesulitan:</strong> <span class="${difficultyClass}">${workout.kesulitan}</span></div>
          <div class="workout-detail"><strong>Deskripsi:</strong> ${workout.description}</div>
          <div class="workout-actions">
            <button class="remove-workout-btn" data-index="${index}">Hapus</button>
          </div>
        </div>
      `;
    });
    
    selectedWorkoutsDiv.innerHTML = html;
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-workout-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const index = parseInt(this.getAttribute('data-index'));
        removeWorkoutByIndex(index);
      });
    });
  }
  
  function removeWorkoutByIndex(index) {
    if (index >= 0 && index < selectedWorkouts.length) {
      const workoutName = selectedWorkouts[index].name;
      selectedWorkouts.splice(index, 1);
      updateSelectedWorkoutsView();
      updateViewProgramButton();
      showNotification(`"${workoutName}" berhasil dihapus dari program.`, 'info');
      
      // Update buttons in recommendations if visible
      const workoutCard = recommendationsDiv.querySelector(`[data-name="${workoutName}"]`);
      if (workoutCard) {
        const actionBtn = workoutCard.querySelector('.action-btn');
        if (actionBtn) {
          actionBtn.className = 'action-btn add-btn';
          actionBtn.textContent = '+';
          actionBtn.title = 'Tambahkan ke program';
        }
      }
    }
  }

  function updateViewProgramButton() {
    if (selectedWorkouts.length > 0) {
      viewProgramBtn.style.display = 'block';
    } else {
      viewProgramBtn.style.display = 'none';
    }
  }
  
  function addWorkoutToProgram(workoutCard, workout) {
    const exists = selectedWorkouts.some(w => w.name === workout.name);
    if (exists) {
      showNotification('Gerakan ini sudah ada dalam program Anda.', 'info');
      return;
    }
    selectedWorkouts.push(workout);
    updateSelectedWorkoutsView();
    updateViewProgramButton();
    const actionBtn = workoutCard.querySelector('.action-btn');
    actionBtn.className = 'action-btn remove-btn';
    actionBtn.textContent = '-';
    actionBtn.title = 'Hapus dari program';
    
    showNotification(`"${workout.name}" berhasil ditambahkan ke program.`, 'success');
  }
  
  function removeWorkoutFromProgram(workoutCard, workoutName) {
    const index = selectedWorkouts.findIndex(w => w.name === workoutName);
    if (index !== -1) {
      selectedWorkouts.splice(index, 1);
      updateSelectedWorkoutsView();
      updateViewProgramButton();
      const actionBtn = workoutCard.querySelector('.action-btn');
      actionBtn.className = 'action-btn add-btn';
      actionBtn.textContent = '+';
      actionBtn.title = 'Tambahkan ke program';
      showNotification(`"${workoutName}" berhasil dihapus dari program.`, 'info');
    }
  }
  
  recommendBtn.addEventListener('click', async function() {
    const workoutType = workoutTypeSelect.value;
    const difficultyLevel = difficultyLevelSelect.value;
    try {
      // Fixed URL to match server route
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workoutType, difficultyLevel }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        recommendationsDiv.innerHTML = `<p>Error: ${data.error || 'Unknown error'}</p>`;
        return;
      }
      
      if (!data.recommendations || data.recommendations.length === 0) {
        recommendationsDiv.innerHTML = '<p>Tidak ada rekomendasi yang ditemukan.</p>';
        return;
      }
      
      currentRecommendations = data.recommendations;
      let html = '<h2>List Gerakan:</h2>';
      
      data.recommendations.forEach(workout => {
        let difficultyClass = '';
        if (workout.kesulitan === 'Easy') difficultyClass = 'difficulty-easy';
        else if (workout.kesulitan === 'Medium') difficultyClass = 'difficulty-medium';
        else if (workout.kesulitan === 'Hard' || workout.kesulitan === 'Very Hard') difficultyClass = 'difficulty-hard';
        
        const isSelected = selectedWorkouts.some(selected => selected.name === workout.name);
        
        html += `
          <div class="workout-card" data-name="${workout.name}">
            <div class="workout-name">${workout.name}</div>
            <div class="workout-detail"><strong>Jenis:</strong> ${workout.jenis}</div>
            <div class="workout-detail"><strong>Subkategori:</strong> ${workout.subkategori || 'N/A'}</div>
            <div class="workout-detail"><strong>Target:</strong> ${workout.target}</div>
            <div class="workout-detail"><strong>Kesulitan:</strong> <span class="${difficultyClass}">${workout.kesulitan}</span></div>
            <div class="workout-detail"><strong>Deskripsi:</strong> ${workout.description}</div>
            <div class="workout-actions">
              <span class="action-btn ${isSelected ? 'remove-btn' : 'add-btn'}" title="${isSelected ? 'Hapus dari program' : 'Tambahkan ke program'}">${isSelected ? '-' : '+'}</span>
            </div>
          </div>
        `;
      });
      
      recommendationsDiv.innerHTML = html;
      
      document.querySelectorAll('.workout-card .action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const workoutCard = this.closest('.workout-card');
          const workoutName = workoutCard.getAttribute('data-name');
          const workout = currentRecommendations.find(w => w.name === workoutName);
          
          if (!workout) return;
          
          if (this.classList.contains('add-btn')) {
            addWorkoutToProgram(workoutCard, workout);
          } else {
            removeWorkoutFromProgram(workoutCard, workoutName);
          }
        });
      });
      
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      recommendationsDiv.innerHTML = '<p>Terjadi kesalahan saat mengambil rekomendasi.</p>';
    }
  });

  viewProgramBtn.addEventListener('click', function() {
    showSlide(myProgramSection);
    updateSelectedWorkoutsView();
  });
});
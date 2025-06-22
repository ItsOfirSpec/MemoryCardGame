let firstCard = null;
let lock = false;
let goodSteps = 0;
let badSteps = 0;
let totalMatches = 0;
let neededMatches = 0;
let lastRows = 4;
let lastCols = 4;
let lastApiUrl = "";
let isInit = false;
const limitArrayAndRandom = (arr, maxCount) => {
    const result = [];
    const temp = arr.slice();
    while (result.length < maxCount && temp.length > 0) {
        const index = Math.floor(Math.random() * temp.length);
        result.push(temp.splice(index, 1)[0]);
    }
    return result;
}

const shuffleImagesArray = (arr) => {
    const result = [];
    const temp = arr.slice();
    while (temp.length) {
        const index = Math.floor(Math.random() * temp.length);
        result.push(temp.splice(index, 1)[0]);
    }
    return result;
};


const generateImages = (count, width, height) => {
    const images = [];
    const usedSeeds = new Set();

    while (images.length < count) {
        const seed = Math.random().toString(36).substring(2, 8);
        if (!usedSeeds.has(seed)) {
            usedSeeds.add(seed);
            images.push(`https://picsum.photos/seed/${seed}/${width}/${height}`);
        }
    }
    return images;
};
const preloadImages = async (imagesUrlsArr) =>
    await Promise.all(imagesUrlsArr.map(url =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        })
    ));
async function fetchImageForAnyApi(apiUrl, neededMatches, page = 0) {
    let isPage = page > 0;
    apiUrl = (isPage) ? `${apiUrl}&page=${page}` : apiUrl;
    const response = await fetch(apiUrl);
    if (!response.ok) {
        return generateImages(neededMatches, 100, 140);
    }
    const data = await response.json();
    let images = [];
    const imageExtensions = ['.jpg', '.jpeg', '.png'];

    function strEndsWith(str, suffix) {
        return str.toLowerCase().endsWith(suffix);
    }
    function extractImages(obj) {
        if (Array.isArray(obj)) {
            obj.forEach(extractImages);
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                extractImages(obj[key]);
            }
        } else if (typeof obj === 'string') {
            for (const ext of imageExtensions) {
                if (strEndsWith(obj, ext)) {
                    images.push(obj);
                    break;
                }
            }
        }
    }
    extractImages(data);
    if (!isPage) {
        while (images.length < neededMatches) {
            page++;
            let anotherImages = await fetchImageForAnyApi(apiUrl, neededMatches, page);
            images = images.concat(anotherImages);
        }
    }
    return images;
}

const createBoard = async (rows, cols) => {
    if(isInit) return;
    isInit = true;
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    firstCard = null;
    lock = false;
    goodSteps = 0;
    badSteps = 0;
    totalMatches = 0;
    neededMatches = (rows * cols) / 2;
    lastRows = rows;
    lastCols = cols;
    updateSteps();

    let images = (lastApiUrl != "") ? await fetchImageForAnyApi(lastApiUrl, neededMatches) : generateImages(neededMatches, 100, 140);
    images = (images.length > neededMatches) ? limitArrayAndRandom(images, neededMatches) : images;
    board.classList.add('loading');
    await preloadImages(images);
    board.classList.remove('loading');
    const cards = shuffleImagesArray(images.concat(images));
    
    cards.forEach(url => {
        const card = document.createElement('div');
        card.className = 'card';

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        const front = document.createElement('div');
        front.className = 'card-front';
        front.style.backgroundImage = `url(${url})`;

        const back = document.createElement('div');
        back.className = 'card-back';

        inner.appendChild(front);
        inner.appendChild(back);
        card.appendChild(inner);

        card.addEventListener('click', () => {
            if (lock || card.classList.contains('flipped')) return;

            card.classList.add('flipped');

            if (!firstCard) {
                firstCard = card;
                return;
            }

            const img1 = firstCard.querySelector('.card-front').style.backgroundImage;
            const img2 = card.querySelector('.card-front').style.backgroundImage;

            if (img1 === img2) {
                goodSteps++;
                totalMatches++;
                firstCard = null;
                if (totalMatches === neededMatches) {
                    document.getElementById('finished-overlay').style.display = 'flex';
                }
            } else {
                lock = true;
                badSteps++;
                setTimeout(() => {
                    firstCard.classList.remove('flipped');
                    card.classList.remove('flipped');
                    firstCard = null;
                    lock = false;
                }, 900);
            }

            updateSteps();
        });

        board.appendChild(card);
    });
    isInit = false;
};

const updateSteps = () => {
    document.getElementById('goodSteps').textContent = goodSteps;
    document.getElementById('badSteps').textContent = badSteps;
};

const resetGame = () => {
    document.getElementById('finished-overlay').style.display = 'none';
    createBoard(lastRows, lastCols);
};
window.addEventListener('load', () => {
    createBoard(4, 4);
    document.getElementById('category-select').addEventListener('change', function () {
        switch (this.value) {
            case 'characters':
                lastApiUrl = "https://hp-api.onrender.com/api/characters";
                break;
            case 'dogs':
                lastApiUrl = "https://api.thedogapi.com/v1/images/search?limit=100";
                break;
            case 'cats':
                lastApiUrl = "https://api.thecatapi.com/v1/images/search?limit=100";
                break;
            default:
                lastApiUrl = "";
                break;
        }
        createBoard(lastRows, lastCols);
    });
});

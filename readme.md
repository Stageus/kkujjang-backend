<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">끝짱</h3>
  <p align="center">
    끝말잇기 웹게임 개발 프로젝트
    <br />
    <a href="https://kkujjang.godbell.kr">플레이</a>
  </p>
</div>

<!-- GETTING STARTED -->

## For Developers

### Prerequisites

- NodeJS `>= v20`

### Installation

1. Get proper API Keys
2. Clone the repo
   ```sh
   git clone https://github.com/Stageus/kkujjang-backend
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Enter your environment variables in newly created `.env.dev` or `.env.prod`. Please check the `.env.template` file.

### Run

1. Build Docker Image, if no exists.
   ```sh
   npm run docker-compose:build-dev
   npm run docker-compose:build-prod
   ```
2. Run Docker Image as a Container.
   ```sh
   npm run docker-compose:dev
   npm run docker-compose:prod
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

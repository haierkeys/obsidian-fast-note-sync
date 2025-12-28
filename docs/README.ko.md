[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)


<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>빠르고, 안정적이며, 효율적이고, 자유롭게 배포 가능한 Obsidian 노트 동기화 및 백업 플러그인</strong>
  <br>
  <em>프라이빗 배포를 지원하며, Obsidian 사용자에게 방해받지 않는 부드럽고 실시간 멀티 디바이스 노트 동기화 및 백업 플러그인을 제공하는 데 집중합니다. Mac, Windows, Android, iOS 등의 플랫폼을 지원하며 다국어를 제공합니다.</em>
</p>

<p align="center">
  독립 서버와 함께 사용해야 합니다: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ 플러그인 기능

- **간단한 설정**: 복잡한 설정이 필요 없으며, 원격 서버 설정을 붙여넣기만 하면 바로 사용할 수 있습니다.
- **노트 실시간 동기화**: Vault(저장소) 내 모든 노트의 생성, 업데이트 및 삭제 작업을 자동으로 모니터링하고 동기화합니다.
- **첨부 파일 완벽 지원**: 이미지, 비디오, 오디오 등 각종 비설정 파일을 실시간으로 동기화합니다.
    > ⚠️ **주의**: v1.0+, 서버 v0.9+가 필요합니다. 첨부 파일 크기를 관리하세요. 큰 파일은 동기화 지연을 유발할 수 있습니다.
- **설정 동기화**: 설정 동기화 기능을 제공하여 여러 기기 간 설정 동기화를 지원하며, 여러 기기에 수동으로 설정 파일을 복사하는 고통에서 벗어날 수 있습니다.
    > ⚠️ **주의**: v1.4+, 서버 v1.0+가 필요합니다. 현재 테스트 단계이므로 신중하게 사용하세요.
- **서버 버전 표시**: 서버의 버전 정보를 표시하여 서버 버전 상태를 쉽게 파악할 수 있습니다.
- **멀티 플랫폼 동기화**: Mac, Windows, Android, iOS 등의 플랫폼을 지원합니다.
- **노트 히스토리**: 노트 히스토리 기능을 제공합니다. 플러그인 측, 서버 측 WebGUI에서 노트의 모든 히스토리 수정 버전을 확인할 수 있으며, 수정 세부 정보를 확인하거나 히스토리 버전 내용을 복사할 수 있습니다.

## 🗺️ 로드맵

우리는 지속적으로 개선하고 있습니다. 다음은 향후 개발 계획입니다:


- [ ] **클라우드 스토리지 백업 상태**: 언제든지 클라우드 스토리지 백업 상태를 확인할 수 있는 기능으로, 최신 클라우드 스토리지 백업 상태를 파악할 수 있습니다.
- [ ] **노트 공유 기능**: 클라우드 노트의 공유 링크를 생성하여 자신의 성과를 다른 사람과 쉽게 공유할 수 있습니다.
- [ ] **AI 노트**: AI+ 노트 관련 혁신적인 기능을 탐색합니다. 귀중한 제안을 기다리고 있습니다.

> **개선 제안이나 새로운 아이디어가 있으시면 issue를 제출하여 저희와 공유해 주세요. 진지하게 평가하고 적절한 제안을 채택하겠습니다.**

## 💰 가격

- 이 플러그인이 유용하고 지속적인 개발을 지원하고 싶다면 여기에서 지원할 수 있습니다:
[<img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=3" alt="BuyMeACoffee" width="100">](https://ko-fi.com/haierkeys)


## 🚀 빠른 시작

1. 플러그인 설치 (둘 중 하나 선택)
   - **공식 스토어**: <s>Obsidian 커뮤니티 플러그인 마켓플레이스를 열고 **Fast Note Sync**를 검색하여 설치</s>
        > ⚠️ 플러그인이 아직 공식 스토어에 등록되지 않아 검색할 수 없습니다. 수동으로 설치하세요
   - **수동 설치**: https://github.com/haierkeys/obsidian-fast-note-sync/releases 에 방문하여 설치 패키지를 다운로드하고, Obsidian 플러그인 디렉토리 **.obsidian/plugin**에 압축을 풉니다
2. 플러그인 설정을 열고 **원격 설정 붙여넣기** 버튼을 클릭하여 원격 서버 설정을 입력 상자에 붙여넣습니다.


## 📦 서버 배포

백엔드 서비스 설정은 다음을 참조하세요: [Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service).

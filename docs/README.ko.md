[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)

문제가 있는 경우 새로운 [issue](https://github.com/haierkeys/obsidian-fast-note-sync/issues/new)를 생성하거나, 텔레그램 뉴스 그룹에 가입하여 도움을 요청하세요: [https://t.me/obsidian_users](https://t.me/obsidian_users)

중국 본토 지역의 경우, 텐센트 `cnb.cool` 미러 저장소 사용을 권장합니다: [https://cnb.cool/haierkeys/obsidian-fast-note-sync](https://cnb.cool/haierkeys/obsidian-fast-note-sync)

<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>

<p align="center">
  <strong>빠르고 안정적이며 효율적인, 어디서나 배포 가능한 Obsidian 노트 동기화 및 백업 플러그인</strong>
  <br>
  <em>사설 배포가 가능하며, Obsidian 사용자에게 방해 없는 매우 부드러운 다중 기기 실시간 동기화 플러그인을 제공하는 데 중점을 둡니다. Mac, Windows, Android, iOS 등의 플랫폼을 지원하며 다국어 지원을 제공합니다.</em>
</p>

<p align="center">
  독립적인 서버가 필요합니다: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="/docs/images/demo.gif" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ 플러그인 기능

- 🚀 **극도로 단순한 설정**:
    - 번거로운 설정 없이 원격 서비스 구성을 붙여넣기만 하면 즉시 사용할 수 있습니다.
    - 데스크톱 버전에서는 한 번의 클릭으로 구성을 가져와 자동으로 인증을 완료할 수도 있습니다.
- 📗 **노트 실시간 동기화**:
    - Vault(보관소) 내의 모든 노트 생성, 업데이트 및 삭제 작업을 자동으로 감지하고 동기화합니다.
- 🖼️ **첨부 파일 완벽 지원**:
    - 이미지, 비디오, 오디오 등 모든 비설정 파일을 실시간으로 동기화합니다.
    > ⚠️ **주의**: v1.0 이상, 서버 v0.9 이상이 필요합니다. 첨부 파일 크기를 적절하게 관리해 주세요. 파일이 크면 동기화 지연이 발생할 수 있습니다.
- ⚙️ **구성 동기화**:
    - 구성 동기화 기능을 제공하여 여러 기기 간의 구성 동기화를 지원합니다. 여러 기기에 수동으로 구성 파일을 복사하는 번거로움에서 벗어날 수 있습니다.
    > ⚠️ **주의**: v1.4 이상, 서버 v1.0 이상이 필요합니다. 현재 테스트 단계이므로 주의하여 사용하세요.
- 🛂 **동기화 제외 및 화이트리스트**:
    - 동기화 제외 및 화이트리스트 기능을 제공하여 자신만의 동기화 전략을 지정할 수 있습니다.
- 🔄 **멀티 플랫폼 동기화**:
    - Mac, Windows, Android, iOS 등의 플랫폼을 지원합니다.
- 📝 **노트 기록**:
    - 노트 기록 기능을 제공하여 노트의 모든 과거 수정 내역을 자세히 확인할 수 있습니다.
    - 노트를 이전 버전으로 복구할 수 있습니다.
- 🛡️ **오프라인 노트 편집 자동 병합**:
    - 오프라인 기기에서 수행된 노트 수정 사항은 서버에 다시 연결될 때 자동으로 병합되어, 최신 업데이트만 유지함에 따른 데이터 손실을 방지합니다.
- 🚫 **오프라인 삭제 동기화 및 보완**:
    - 오프라인 중에 수행된 노트, 첨부 파일, 구성 삭제 작업은 다음 연결 시 서버로 자동 동기화되거나 서버에서 자동으로 보완됩니다.
- 🔍 **버전 감지**:
    - 버전 감지 기능을 제공하여 플러그인과 서버의 최신 버전 정보를 빠르게 확인하고 신속하게 업그레이드할 수 있습니다.
- ☁️ **첨부 파일 클라우드 미리보기**:
    - 첨부 파일 온라인 미리보기 기능을 제공합니다. 첨부 파일을 로컬 기기에 동기화할 필요가 없어 로컬 저장 공간을 절약할 수 있습니다.
    > 플러그인의 제외 설정과 함께 사용하면, 특정 첨부 파일에 대해 서버를 거치지 않고 타사 저장소(예: WebDAV)를 직접 사용할 수 있습니다.
- 🗒️ **동기화 로그**:
    - 동기화 로그 기능을 제공하여 각 동기화의 상세 정보를 확인할 수 있습니다.

## 🗺️ 로드맵 (Roadmap)

지속적으로 개선 중이며, 향후 개발 계획은 다음과 같습니다:
- [ ] **노트 공유 기능**: 클라우드 노트를 위한 공유 링크를 생성하여 자신의 성과를 다른 사람과 쉽게 공유할 수 있도록 합니다.
- [ ] **종단간 암호화**: 종단간 암호화 기능을 제공하여 노트 데이터가 어디에 저장되든 안전하게 보호되도록 합니다.
- [ ] **클라우드 스토리지 백업**: 클라우드 스토리지 백업 기능을 제공하여 노트 데이터가 유실되지 않도록 보호합니다.

- [ ] **AI 노트**: AI+ 노트와 관련된 혁신적인 활용 방법을 모색하고 있습니다. 여러분의 소중한 제안을 기다립니다.

> **개선 제안이나 새로운 아이디어가 있다면 issue를 제출하여 공유해 주세요. 소중한 제안을 신중하게 검토하여 반영하겠습니다.**

## 💖 후원 및 지원

- 이 플러그인이 유용하다고 생각하시고 계속 개발되기를 원하신다면 아래의 방법으로 저희를 지원해 주세요. 오픈 소스 소프트웨어에 대한 지원에 감사드립니다:

  | Ko-fi *중국 이외 지역*                                                                                                     |    | 위챗페이 *중국 지역*                                                       |
  |----------------------------------------------------------------------------------------------------------------------|----|--------------------------------------------------------------------|
  | [<img src="https://ik.imagekit.io/haierkeys/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | or | <img src="https://ik.imagekit.io/haierkeys/wxds.png" height="150"> |

- 후원자 명단:
  - <a href="https://github.com/haierkeys/fast-note-sync-service/blob/master/docs/Support.zh-CN.md">Support.zh-CN.md</a>


## 🚀 시작하기

1. 플러그인 설치 (세 가지 방법 중 선택)
   - **권장**: **BRAT**를 사용하여 설치(모바일 설치 지원): Obsidian 플러그인 커뮤니티에서 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 플러그인을 검색하여 설치한 후, 플러그인 설정 화면으로 들어가 **Add plugin**을 클릭하고 https://github.com/haierkeys/obsidian-fast-note-sync 를 붙여넣습니다.
   - **공식 스토어**: <s>Obsidian 플러그인 커뮤니티 시장을 열고 **Fast Note Sync**를 검색하여 설치합니다</s>
        > ⚠️ 플러그인이 아직 공식 스토어에 등록되지 않아 검색이 불가능합니다. 수동으로 설치해 주세요.
   - **수동 설치**: https://github.com/haierkeys/obsidian-fast-note-sync/releases 에 접속하여 설치 패키지를 다운로드하고 Obsidian 플러그인 디렉터리 **.obsidian/plugins**에 압축을 풉니다.
2. 플러그인 설정 항목을 열고, **Paste Remote Config**(원격 구성 붙여넣기) 버튼을 클릭하여 입력란에 원격 서비스 구성을 붙여넣습니다.


## 📦 서버 배포

백엔드 서버 설정은 다음을 참조하세요: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>.

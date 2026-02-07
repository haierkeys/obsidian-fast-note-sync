

# -------------------------
# PHONY 目标
# -------------------------
.PHONY: all dev ver

# 默认目标
all: test

# -------------------------
# 简单目标
# -------------------------
test:
	@echo ${REPO}

dev:
	pnpm run dev

air:
	pnpm run dev

cp:
	cp  ./main.js /Users/DevApps/@JsApps/ObsPlugins2/.obsidian/plugins/obsidian-fast-note-sync/


# 更新版本脚本调用
ver:
	@node ./scripts/update-version.js $(filter-out $@,$(MAKECMDGOALS))

# 捕获 ver 后面的参数，防止 make 将其视为目标
%:
	@:

gen:
	go run -v ./cmd/gorm_gen/gen.go -type sqlite -dsn storage/database/db.sqlite3
	go run -v ./cmd/model_gen/gen.go

# 运行
run:
#	$(call checkStatic)
	$(call init)
	$(gor) -v $(rootDir)

clean:
	rm -rf $(buildDir)

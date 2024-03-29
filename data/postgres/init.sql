CREATE SCHEMA kkujjang

CREATE TABLE kkujjang.inquiry_thread
(
	id                serial        NOT NULL,
	need_answer       boolean       NOT NULL,
	author_id         serial        NOT NULL,
	start_inquiry_id  serial        NOT NULL,
	thread_id         uuid          NOT NULL UNIQUE,
	type              integer       NOT NULL,
	title             varchar(100)  NOT NULL,
	created_at        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id)
);

CREATE TABLE kkujjang.inquiry_article
(
  id         serial        NOT NULL,
	author_id  serial        NOT NULL,
	thread_id  uuid          NOT NULL,
  content    varchar(2000) NOT NULL,
	created_at timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE kkujjang.inquiry_file
(
  id         serial       NOT NULL,
  inquiry_id serial       NOT NULL,
  key        varchar(512) NOT NULL,
  file_order integer      NOT NULL,
	created_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE kkujjang.notice
(
  id         serial       NOT NULL,
  author_id  serial       NOT NULL,
  title      varchar(100) NOT NULL,
  content    text         NOT NULL,
	views      integer      NOT NULL DEFAULT 0,
  created_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp   ,
  is_deleted bool         NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id)
);

CREATE TABLE kkujjang.notice_file
(
  id         serial       NOT NULL,
  notice_id  serial       NOT NULL,
  key        varchar(512) NOT NULL,
  file_order integer      NOT NULL,
	created_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

COMMENT ON COLUMN kkujjang.notice.id IS 'DB 인덱스';

CREATE TABLE kkujjang.report
(
  id             serial       NOT NULL,
  author_id      serial       NOT NULL,
  reportee_id    serial       NOT NULL,
  is_offensive   boolean      NOT NULL DEFAULT FALSE,
  is_poor_manner boolean      NOT NULL DEFAULT FALSE,
  is_cheating    boolean      NOT NULL DEFAULT FALSE,
  note           varchar(500),
  created_at     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
	is_handled     boolean      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id)
);

CREATE TABLE kkujjang.user
(
  id              serial       NOT NULL,
	kakao_id        varchar(30),
  username        varchar(20),
  password        varchar(72),
	phone           varchar(16), 
	avatar_accessory_index    integer      NOT NULL, 
  nickname        varchar(20)  NOT NULL,
	level           integer      NOT NULL DEFAULT 1,
	exp             integer      NOT NULL DEFAULT 0,
  wins            integer      NOT NULL DEFAULT 0,
  loses           integer      NOT NULL DEFAULT 0,
  created_at      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  authority_level integer      NOT NULL DEFAULT 0,
  is_deleted      bool         NOT NULL DEFAULT FALSE,
  is_banned       bool         NOT NULL DEFAULT FALSE,
  banned_reason   varchar(100),
  banned_until    timestamp   ,
  PRIMARY KEY (id)
);

ALTER TABLE kkujjang.notice_file
	ADD CONSTRAINT FK_notice_file_TO_notice
    FOREIGN KEY (notice_id)
    REFERENCES kkujjang.notice (id);

ALTER TABLE kkujjang.inquiry_thread
	ADD CONSTRAINT FK_inquiry_article_TO_inquiry_thread
    FOREIGN KEY (start_inquiry_id)
    REFERENCES kkujjang.inquiry_article (id);
	
ALTER TABLE kkujjang.inquiry_article
	ADD CONSTRAINT FK_user_TO_inquiry_article
    FOREIGN KEY (author_id)
    REFERENCES kkujjang.user (id);

ALTER TABLE kkujjang.inquiry_file
  ADD CONSTRAINT FK_inquiry_article_TO_inquiry_file
    FOREIGN KEY (inquiry_id)
    REFERENCES kkujjang.inquiry_article (id);

ALTER TABLE kkujjang.notice
  ADD CONSTRAINT FK_user_TO_notice
    FOREIGN KEY (author_id)
    REFERENCES kkujjang.user (id);

ALTER TABLE kkujjang.report
  ADD CONSTRAINT FK_user_TO_report
    FOREIGN KEY (author_id)
    REFERENCES kkujjang.user (id);

ALTER TABLE kkujjang.report
  ADD CONSTRAINT FK_user_TO_report1
    FOREIGN KEY (reportee_id)
    REFERENCES kkujjang.user (id);

CREATE extension pgcrypto;
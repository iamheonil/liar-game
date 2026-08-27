package com.liargame.interfaces.rest;

import com.liargame.domain.RuleViolationException;
import com.liargame.interfaces.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * REST 오류 응답을 한곳에서 만듦.
 *
 * <p>규칙 위반과 잘못된 입력은 보낸 쪽이 고칠 수 있는 문제이므로 사유를 그대로 돌려주고 400 으로
 * 답함. 그 밖의 예외만 서버 결함으로 보고 내부 정보가 새지 않도록 일반 문구로 바꿔 내보냄.
 */
@RestControllerAdvice
public class RestExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(RestExceptionHandler.class);

    @ExceptionHandler({RuleViolationException.class, IllegalArgumentException.class})
    public ResponseEntity<ErrorResponse> handleBadRequest(RuntimeException exception) {
        return ResponseEntity.badRequest().body(new ErrorResponse(exception.getMessage()));
    }

    /** 본문이 JSON 이 아니거나 인코딩이 깨진 경우. 서버 결함이 아니므로 로그를 남기지 않음. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadableBody() {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("요청 형식이 올바르지 않습니다"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception exception) {
        log.error("처리하지 못한 요청", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("일시적인 오류가 발생했습니다"));
    }
}
